#Main.py
import tornado.httpserver
import tornado.ioloop
import logging
import tornado.auth
import tornado.escape
import tornado.options
import tornado.web
import textwrap
import os.path
import tornado.websocket
import json
import random
from uuid import uuid4
import time
from datetime import datetime
#import thread
from tornado import gen
from tornado.options import define, options
import requests

define ("port", default=8000, help="run on the given port", type=int)
api_url = ':19999/api/3.0/'
looker_url = None # https://example.looker.com
authenticator = None
api_cookie_secret = ''  #Place your cookie secret here.

class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
			(r"/sockets", SocketHandler),
            (r"/", MainHandler)
        ]
        settings = dict(
            template_path = os.path.join(os.path.dirname(__file__), "templates"),
            static_path = os.path.join(os.path.dirname(__file__), "static"),
            cookie_secret = api_cookie_secret, 
            xsrf_cookies = True,
            login_url = "/auth/login",
            debug = True
        )
        tornado.web.Application.__init__(self,handlers,**settings)

class BaseHandler(tornado.web.RequestHandler):
    def get_login_url(self):
        return u"/auth/login"
    
    def get_current_user(self):
        user_json = self.get_secure_cookie("user")
        if not user_json: return None
        return unJSON(user_json)

class MainHandler(BaseHandler):
    def get(self):
        self.render("main.html")

    def open(self):
    	print ("Echo Open.")

    def on_close(self):
        print ("Echo Close.")

    def callback(self):
        print ("Echo Callback.")


class SocketHandler(tornado.websocket.WebSocketHandler):

	def open(self):
		print ("Echo Open.")

	def on_close(self):
		print ("Echo Close.")

	def callback(self):
		print ("Echo Callback.")

	def on_message(self, message):
		global looker_url
		global authenticator
		pyMessage = json.loads(message)
		sendback = {}
		sendbackMessages = True
		if pyMessage["subject"] == "login":
			print ("User Attempting Login to", pyMessage["looker_url"])
			print ("client_id:", pyMessage["client_id"], " client_secret:", pyMessage["client_secret"])
			looker_url = pyMessage["looker_url"] + api_url
			authenticator = loginToLooker(looker_url,pyMessage["client_id"],pyMessage["client_secret"])
			if (authenticator["subject"] == "loginSuccessful"):
				sendback = getModels(authenticator)
			else:
				sendback = authenticator
		elif pyMessage["subject"] == "getExplore":
			print ("User Attempting to get explore")
			model = pyMessage["model"]
			explore =  pyMessage["explore"]
			print ("Model:", model, " Explore:", explore)
			data = getExplore(authenticator,model,explore)
			sendback = {"subject":"exploreData", "body":data}
		if sendbackMessages:
			self.write_message(sendback)  
    




################################## CUSTOM FUNCTIONS ##################################

                  
def unJSON(message):
    """Just a shorthand for decoding json in tornado."""
    return tornado.escape.json_decode(message)

def getModels(authenticator):
	login_string = looker_url+"lookml_models"
	headers = {"Authorization":"token "+authenticator["body"]["access_token"] }
	r = requests.get(login_string,headers=headers) 
	message = {"subject":"loginSuccessful", "body":r.json()}

	return message


def getExplore(authenticator,model,explore):
	get_explore_string = looker_url+"lookml_models/"+model+"/explores/"+explore
	headers = {"Authorization":"token "+authenticator["body"]["access_token"] }
	r = requests.get(get_explore_string,headers=headers)
	return r.json()


def loginToLooker(looker_url,client_id,client_secret):
	login_string = looker_url+"login?client_id="+client_id+'&client_secret='+client_secret
	try:
		r = requests.post(login_string)
		print (r.json())
		message =  {"subject":"loginSuccessful", "body":r.json()}
	except requests.exceptions.InvalidSchema as err:
		print ("ERROR LOGGING IN - no such site")
		message =  {"subject":"loginUnsuccessful", "body":"Invalid Schema"}
	except requests.exceptions.SSLError as error:
		print ("ERROR LOGGING IN - SSLError")
		message =  {"subject":"loginUnsuccessful", "body":"SSLError"}
	except Exception as err:
		print ("UNKNOWN ERROR")
		message =  {"subject":"loginUnsuccessful", "body":"Unknown Error"}
	else:
		pass
	finally:
		pass
	return message
 

################################## ACTUALLY RUNNING ##################################

def main():
	tornado.options.parse_command_line()
	http_server = tornado.httpserver.HTTPServer(Application())
	http_server.listen(options.port)
	printString = "("+str(datetime.now())+")::Server Online:"
	print (printString)
	tornado.ioloop.IOLoop.instance().start()



if __name__ == "__main__":
	main()
    