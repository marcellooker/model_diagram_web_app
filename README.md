# model_diagram_web_app

_____________________________________________________________________________________
# INSTALLATION

To make sure this works, you'll need Python 3 (google Python 3 online for a latest download) and to get Tornado. Following these steps should ensure that everything works:

- Open Terminal and navigate to the folder where you have put this app
- enter: sudo easy_install pip
- enter: sudo python -m pip install tornado
- enter: sudo pip install requests



Once that is all set up, to run the program simple enter:

sudo python Main.py

If it says "Server Online" then you're good to go!

Visit localhost:8000 in your browser to see the vis app.


_____________________________________________________________________________________
# HOW IT WORKS

Because browsers cannot directly call Looker's API due to XSS (https://en.wikipedia.org/wiki/Cross-site_scripting), this application requires a "server." This server, in this case, is still the same machine; your computer. 

The application itself is written in Python, and uses a server framework called Tornado. Tornado can deliver dynamic webpages to the client (in this case also the same computer), that are rendered by the browser. Additionally, it uses websockets to send further data, even once that page is loaded.

What happens when you run it: 
When you start the Python script and visit localhost:8000 Tornado has already sent an HTML/javascript page to the browser, where users input Looker API credentials. Once there, those credentials pass to Python/Tornado via websocket, which tells Python to send an API request to Looker, grabbing the needed data. That data is then sent again via websocket to the browser, where the javascript code renders the visualizations. 

The only code modificationt that will be required is to put your cookie secret (near the top of the Main.py script) in for proper authentication. 
