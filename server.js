/* 	Arun Thayanithy
	S.N: 100887220
	Comp 2406 - A3
	Developed by: Arun Thayanithy
	Pieces of code was taken from: Andrew Runka Mongo's Code Lectures
*/

// Importing all the required modules needed
var express = require('express'); 
var app = express();
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var mongo = require('mongodb').MongoClient;
var hat = require('hat');

// Render a pug page for the index 
app.set('views','./views');
app.set('view engine', 'pug');

//Connect to the mongo server, and keep it as a variable for ease of use and access later
var db;
mongo.connect("mongodb://localhost:27017/recipeDB", function(err,database){
	if(err)throw err;
	db = database;
	app.listen(2406,function() {console.log("Server listening on port 2406");});
});

//Setting up middleware, by calling the next() function
app.use(function(req,res,next){
	console.log(req.method+" request for "+req.url);
	next();
});

//This get request will check to see if the user has any cookies that has their username associated along with a user authentication 
app.get(['/', '/index.html', '/home', '/index'], cookieParser(), function(req,res){
	db.collection("clients").findOne({username:req.cookies.username},function(err,user){ //assume unique usernames.
		if(user && user.auth===req.cookies.token){
			console.log("User authenticated.");
			res.render('index',{user: {username:req.cookies.username, auth:user.auth}});
		}else{
			res.render('index',{});
		}
	});
});

//send user login page
app.get('/login', function(req,res){
	res.render('login');
});

//send user registration page
app.get('/register', function(req,res){
	res.render('register');
});

//send log out page and clear cookies
app.get('/logout',function(req,res){
	res.clearCookie("token",{path:'/'});
	res.clearCookie("username",{path:'/'});
	res.redirect('/');
});

//using bodyParser to process incoming data from the server
app.use(['/login','/register'], bodyParser.urlencoded({extended:false}));

//handler for login posts from the server 
app.post('/login', function(req,res){

	//checks to see if the user has a profile 
	db.collection("clients").findOne({username:req.body.username.toLowerCase()},function(err,user){
		console.log("user found: ",user);
		if(err){
			console.log("Error performing find : ", err);
			res.sendStatus(500);
		}else if(!user){ //not found
			res.render('login',{warning:"Username not found"});
		}else if(user.password!==req.body.password){  //user exists, wrong password
			console.log("incorrect password: ", user.password+"!="+req.body.password);
			res.render('login',{warning:"Incorrect password"});
		}else{	//user exists && pwd correct
			console.log("Log in successful");
			//create auth token
			var token = hat(); //create a random token
			user.auth=token; //save token with the specific user
			
			db.collection("clients").update({_id:user._id},user,function(err,result){ //update the document
				if(err){
					console.log("Error updating the database: ",err);
					res.sendStatus(500);
				}else{
					createAuthCookies(user,res);
					res.redirect("/");
				}	
			});
		}
	});
});

//handler for register posts from the server 
app.post('/register', function(req,res){
	//if user exists the page will warn the user, saying the username already exists
	db.collection("clients").findOne({username:req.body.username.toLowerCase()},function(err,user){
		if(err){
			console.log("Error performing find: ", err);
			res.sendStatus(500);
		}else if(user){ 	//if name exists
			//render login page with warning
			res.render('register',{warning:"Username already exists"});
		}else{ //user not found
			//add to db, and perform authentication
			var user = new User(req.body.username.toLowerCase(), req.body.password);
			//create auth token
			var token = hat(); //create a random token
			user.auth=token; //save token with the specific user
			//this token will be used throughout the server to authenticate the user to make sure no monkey games are played with the cookies being stored 
			db.collection("clients").insert(user, function(err,result){
				if(err){
					console.log("Error inserting into database: ",err);
					res.sendStatus(500);
				}else{	
					createAuthCookies(user,res);
					//tell the browser to request the main page
					var test = {
						username: req.body.username.toLowerCase(), 
						recipeCollection : []
					};
					db.collection("recipes").insert(test, function(err,result){
						if(err){
							console.log("Error inserting into database: ", err);
						} else {
							console.log("Success inserting");
							res.redirect("/");
						}
					});
				}
			});
		}
	});
});


app.use('/recipes', cookieParser());

//handle recips requests to populate the dropdown menu
app.get('/recipes', function(req,res){
	var tempArray = [];
	//before attempting anything, this will check to make sure the user's authorization cookie matches that stored on the server
	db.collection("clients").findOne({username:req.cookies.username}, function(err, user){
		if(err) res.sendStatus(500);
		else{
			//if the user's authentication works, the following will be executed 
			if(user && user.auth===req.cookies.token){
				db.collection("recipes").findOne({username: req.cookies.username}, function(err, document){
					if(err) res.sendStatus(500);
					else{
						if(document){
							var temp = document;
							for(var i in temp.recipeCollection){
								tempArray.push(temp.recipeCollection[i].name);
							}
							var response = {
								names: tempArray
							}
							res.send(response);
						} else {
							res.sendStatus(401);
						}
					}
				});
			}
			else {
				res.sendStatus(401);
			}
		}
	});
});

//handle recips requests to populate the text areas upon clicking a recipe to see the appropriate information 
app.use("/recipe/:name", cookieParser());
app.get("/recipe/:name", function(req,res){
	//before attempting anything, this will check to make sure the user's authorization cookie matches that stored on the server
	db.collection("clients").findOne({username:req.cookies.username}, function(err, user){
		if(err) res.sendStatus(500);
		else{
			if(user && user.auth===req.cookies.token){
				db.collection("recipes").findOne({username:req.cookies.username}, function(err, document){
					if(err) res.sendStatus(500);
					else{
						//the recipeCollection is a nested element that stores the recipes for each associated user 
						console.log("document is", document);
						OUTERFORLOOP:
						for(var i in document.recipeCollection){
							if(document.recipeCollection[i].name == req.params.name){
								var response = {
									name: document.recipeCollection[i].name,
									duration: document.recipeCollection[i].duration,
									ingredients: document.recipeCollection[i].ingredients,
									directions: document.recipeCollection[i].directions,
									notes: document.recipeCollection[i].notes
								}
								res.send(response);
								break OUTERFORLOOP;
							}
						}
					}
				});
			} else {
				res.sendStatus(401);
			}
		}
	});
});


//handle recips requests to send data from the client to the server
app.use("/recipe",bodyParser.urlencoded({extended:false}));
app.use("/recipe",cookieParser());
app.post('/recipe', function(req,res){
	console.log(req.body);
	if(req.body.name === null){
		res.sendStatus(400);
	}
	else{
		var recipe = {
			name: req.body.name,
			duration: req.body.duration,
			ingredients: req.body.ingredients,
			directions: req.body.directions,
			notes: req.body.notes
		};
		//authenticate to make sure the user has proper authorization
		db.collection("clients").findOne({username:req.cookies.username}, function(err, user){
			if(err) res.sendStatus(500);
			else{
				if(user && user.auth===req.cookies.token){
					db.collection("recipes").findOne({username:req.cookies.username}, function(err,user){
						if(err) {
							res.sendStatus(500);
							console.log("Found user successfully, but failed");
						}
						else{
							console.log("Found user successfully");
							var temp2 = user.recipeCollection;
							var boolean2 = false;
							//this for loop checks to see if the user already has a recipe in the database 
							for(var i in temp2){
								if(temp2[i].name == req.body.name){
									boolean2 = true;
									//If the recipe exists, the respective recipeCollection will be updated by pulling the recipe collection, and updating the recipe collection 
									db.collection("recipes").update({}, { $pull: { recipeCollection: { name: req.body.name } }}, function(err, result){
										if(err) res.sendStatus(500);
										else {
											
											db.collection("recipes").update({_id:user._id}, 
												{ $push: {"recipeCollection": recipe}}, function(err, result){
												if(err) {
													console.log("Error updating database: ", err);
													res.sendStatus(500);
												}
												else {
													res.sendStatus(200);
												}
											}); 
										}
									});
								}
							}		
							//if the boolean is false, the recipe doesn't exist, and it will be pushed to the array as a new object under recipeCollection
							if(!boolean2){
								db.collection("recipes").update({_id:user._id}, 
									{ $push: {"recipeCollection": recipe}}, function(err, result){
									if(err) {
										console.log("Error updating database: ", err);
										res.sendStatus(500);
									}
									else {
										res.sendStatus(200);
									}
								}); 
							}
						}
					});
				}
				else {
					res.sendStatus(401);
				}
			}
		});
	}
});

//final routes for errors, and static pages
app.use(express.static("./public"));

app.get('*', function(req, res){
  res.send('404: Page Not Found', 404);
});

function User(name,pass){
	this.username = name;
	this.password = pass;
}

//helper function to create cookies
function createAuthCookies(user,res){
	//create auth cookie
	res.cookie('token', user.auth, {path:'/', maxAge:3600000});
	res.cookie('username', user.username, {path:'/', maxAge:3600000});
}	