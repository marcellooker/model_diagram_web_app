var host = 'ws://localhost:8000/sockets'
var WS = new WebSocket(host);
var models = null
var explores = null
var fields = null
var looker_url = null


$(document).ready(function(){
    console.log("Page opened!")
    WS.onopen = function (evt) {
        console.log("Connection open");
    };
    
    WS.onerror = function(evt){
        console.log("WebSockets has encountered an error");
    };

    WS.onmessage = function(evt){
        var mes = $.parseJSON(evt.data);
        console.log("Websocket message: "+mes["subject"])
        switch (mes["subject"]){
            case "loginUnsuccessful":
                error_message = mes["body"]
                alert(error_message)
                break;
            case "loginSuccessful":
                modelsData = mes["body"];
                models = spliceModelsData(modelsData)
                displayModelSelector(models)
                break;
            case "exploreData":
                exploreData = mes["body"];
                fields = extractFields(exploreData)
                clean_explore_data = cleanExploreData(exploreData)
                visualize(clean_explore_data)
                break;
            default:
                break;
        }
    };
});

function login(){
    looker_url = document.getElementById("looker_url").value
    var client_id = document.getElementById("client_id").value
    var client_secret = document.getElementById("client_secret").value
    mes = {"subject":"login", "looker_url":looker_url, "client_id":client_id, "client_secret":client_secret}
    WS.send(JSON.stringify(mes));
}

function visualizeViewFields(view,x,y){
    removeViewFields()
    var string = '<div class="fieldViewer" id="'+view+'" style="left:'+y.toString()+'px; top:'+x.toString()+'px;">'
    $("#d3").append(string)
    $(".fieldViewer").append("<table><tr><th><div class='dimensions fields'></div></th><th><div class='measures fields'></div></th></tr></table>");
    appendFields(view,"dimensions");
    appendFields(view,"measures");
}

function removeViewFields(){
    $(".fieldViewer").remove()
}

function appendFields(view,field_type){
    for (f=0;f< fields[field_type].length;f++){
        field = fields[field_type][f]
        view_name = field["name"].split(".")[0]
        field_name = field["name"].split(".")[1]
        short_type = field_type.slice(0, -1);
        if(view_name == view){
            $("."+field_type).append("<a class="+short_type+" href='"+looker_url+field['lookml_link']+"'>"+field_name+"</a> ")
        }
    }
}

function visualize(exploreData){
    root = exploreData;
    root.x0 = h / 2;
    root.y0 = 0;
    // Initialize the display to show a few nodes.
    root.children.forEach(toggleAll);
    update(root);
    removeViewFields()
}

function extractFields(exlporeData){
    return exlporeData["fields"]
}

function cleanExploreData(exploreData){
    base_view = exploreData["view_name"]
    dependencies = getExploreDependencies(exploreData)
    hierarchy = flipGraph(dependencies)
    return nestHierarchyInParent(base_view,hierarchy)
}

function nestHierarchyInParent(view,hierarchy){
    var explore = {}
    explore["name"] = view
    if (typeof hierarchy[view] === "undefined") return explore;
    var children = []
    explore["children"] = children
    for (let child of hierarchy[view]){
        var child_view = child
        children.push(nestHierarchyInParent(child_view,hierarchy))
    }     
    return explore
}

function getExploreDependencies(exploreData){
    var dependencies = {}
    var r = /\$\{(.*?)\./g;
    for (j=0;j<exploreData["joins"].length;j++){
        name = exploreData["joins"][j]["name"]
        sql_on = exploreData["joins"][j]["sql_on"]
        dependency_list = sql_on.match(r).map(function(result) { return result.substring(2, result.length-1) });
        unique_dependency_list = removeItem(unique(dependency_list),name)
        dependencies[name] = unique_dependency_list
    }
    return dependencies
}

//Our goal is to have a function that takes a dictionary of node->parents and turns it into node->children
function flipGraph (graph){
    const flippedGraph = {};
    for(let node of Object.keys(graph)){
    //For each key, we'll record the node as a child of each of the parents
        const parents = graph[node];
        storeNodeAsChildOf(node, parents, flippedGraph);
    }
return flippedGraph;
}

//Here's our second function :)
//Input:
//  node - child node
//  parents - array of parent nodes
//  graph - graph we're storing the data in
//Ourput: None (graph is updated)
function storeNodeAsChildOf(node, parents, graph) {
    for(let parent of parents){
        var parentChildren = graph[parent];
        if(typeof parentChildren === "undefined") {
            parentChildren = [];
            graph[parent] = parentChildren;
        }
        if(parentChildren.indexOf(node) !== -1) continue;
        parentChildren.push(node);
    }
} 


function getExploreData(){
    var model_name = document.getElementById("model_select").value
    var explore_name = document.getElementById("explore_select").value
    console.log("Asking for explore data. Model: "+model_name+" Explore: "+explore_name+" ...")
    mes = {"subject":"getExplore", "model":model_name, "explore":explore_name}
    WS.send(JSON.stringify(mes));
}

function displayModelSelector(models){
    if (models === null){return null;}
    $("#model_select").html("")
    for(m=0;m<models.length;m++){
        var model_name = models[m]["model_name"]
        $("#model_select").append('<option value="'+model_name+'">'+model_name+'</option>')
    }
}

function displayExploreSelector(){
    if (models === null){return null}
    var model_name = document.getElementById("model_select").value
    var explore_list = []
    for (m=0;m<models.length;m++){
        if(models[m]["model_name"] == model_name){explore_list = models[m]["explores"]; break;}
    }
    $("#explore_select").html("")
    for(e=0;e<explore_list.length;e++){
        var explore_name = explore_list[e]
        $("#explore_select").append('<option value="'+explore_name+'">'+explore_name+'</option>')
    }
}

function spliceModelsData(data){
    var models = []
    for (p=0;p<data.length;p++){
        //Get all my projects
        var this_model = data[p]
        var clean_model = {"model_name":this_model["name"],"explores":[]}
        clean_model["explores"] = getExploreList(this_model)
        models.push(clean_model)
    }
    return models
}

function getExploreList(model){
    var explore_list = []
    for(e=0;e<model["explores"].length;e++){            
            explore_list.push(model["explores"][e]["name"])
        }
    return explore_list;
}

////////////////////////////////////// Utility Functions //////////////////////////////////

function unique(arr) {
    var u = {}, a = [];
    for(var i = 0, l = arr.length; i < l; ++i){
        if(!u.hasOwnProperty(arr[i])) {
            a.push(arr[i]);
            u[arr[i]] = 1;
        }
    }
    return a;
}

function removeItem(arr) {
    var what, a = arguments, L = a.length, ax;
    while (L > 1 && arr.length) {
        what = a[--L];
        while ((ax= arr.indexOf(what)) !== -1) {
            arr.splice(ax, 1);
        }
    }
    return arr;
}


///////////////////////////////// VISUALIZATION COMPONENTS /////////////////////////////////

function update(source) {
    removeViewFields()
    var duration = d3.event && d3.event.altKey ? 500 : 1000;

    // Compute the new tree layout.
    var nodes = tree.nodes(root).reverse();

    // Normalize for fixed-depth.
    nodes.forEach(function(d) { d.y = d.depth * 350; });

    // Update the nodes…
    var node = vis.selectAll("g.node")
        .data(nodes, function(d) { return d.id || (d.id = ++i); });

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("svg:g")
        .attr("class", "node")
        .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
        

    nodeEnter.append("svg:circle")
        .attr("r", 1e-6)
        .attr("cx",70)
        .style("fill-opacity", 1e-6)
        .style("fill", function(d) { return d._children ? "#ac9bfc" : "#fff"; })
        .on('click',function(d) { 
            if(typeof d.exists == 'undefined' || d.exists == 0){
                this.id = d.name
                visualizeViewFields(d.name,d.x+230,d.y+250);
                d.exists = 1  
            }else{
                d.exists = 0
                removeViewFields();
            }
        })

 
    var textOffset = 50
    nodeEnter.append("svg:rect")
        .attr("x", textOffset-175)
        .attr("y", -10)
        .attr("height", 20)
        .attr("width",180)
        .style("stroke-opacity", 1e-6)
        .style("fill-opacity", 1e-6)
        .style("fill", function(d) { return d._children ? "#ac9bfc" : "#fff"; })
        .on("click", function(d) { toggle(d); update(d); });

    nodeEnter.append("svg:text")
        .attr("x", textOffset) //function(d) { return d.children || d._children ? -10 : 10; })
        .attr("font-family","arial")
        .attr("dy", ".35em")
        .attr("text-anchor", "end") //function(d) { return d.children || d._children ? "end" : "start"; })
        .text(function(d) { return d.name; })
        .style("fill-opacity", 1e-6)
        .on("click", function(d) { toggle(d); update(d); });


    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
        .duration(duration)
        .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

    nodeUpdate.select("circle")
        .attr("r", 9)

    nodeUpdate.select("text")
        .style("fill-opacity", 1);

    nodeUpdate.select("rect")
        .style("stroke-opacity", 1)
        .style("fill-opacity", 1)
        .style("fill", function(d) { return d._children ? "#ac9bfc" : "#fff"; });



    // Transition exiting nodes to the parent's new position.
    var nodeExit = node.exit().transition()
        .duration(duration)
        .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
        .remove();

    nodeExit.select("circle")
        .attr("r", 1e-6);

    nodeExit.select("text")
        .style("fill-opacity", 1e-6);
 
    nodeExit.select("rect")
        .style("fill-opacity", 1e-6)
        .style("stroke-opacity", 1e-6);

    // Update the links…
    var link = vis.selectAll("path.link")
        .data(tree.links(nodes), function(d) { return d.target.id; });

    // Enter any new links at the parent's previous position.
    link.enter().insert("svg:path", "g")
        .attr("class", "link")
        .attr("d", function(d) {
            var o = {x: source.x0, y: source.y0};
            return diagonal({source: o, target: o});
        })
        .transition()
        .duration(duration)
        .attr("d", diagonal);

    // Transition links to their new position.
    link.transition()
        .duration(duration)
        .attr("d", diagonal);

    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
        .duration(duration)
        .attr("d", function(d) {
            var o = {x: source.x, y: source.y};
            return diagonal({source: o, target: o});
        })
        .remove();

    // Stash the old positions for transition.
    nodes.forEach(function(d) {
    d.x0 = d.x;
    d.y0 = d.y;
    });
}

// Toggle children.
function toggle(d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
}

// Toggle Fields
function toggleFields(d){
    if (d.fields) {
        d._fields = d.fields;
        d.fields = null;
    } else {
        d.fields = d._fields;
        d._fields = null;
    }
}

function toggleAll(d) {
    if (d.children) {
        d.children.forEach(toggleAll);
        toggle(d);
    }
}


var m = [200, 150, 200, 150],
    w = 3120 - m[1] - m[3],
    h = 1200 - m[0] - m[2],
    i = 400,
    root;

var tree = d3.layout.tree()
    .size([h, w]);

var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.y, d.x]; });


var vis = d3.select("#d3").append("svg:svg")
    .attr("width", w + m[1] + m[3])
    .attr("height", h + m[0] + m[2])
    .append("svg:g")
    .attr("transform", "translate(" + m[3] + "," + m[0] + ")");



