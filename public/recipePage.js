//Client-side interaction controller for Recipe Display page
//Author: Andrew Runka


$(document).ready(function(){
	//register two buttons
	$("#recipeViewButton").click(viewRecipe);
	$("#recipeSubmitButton").click(sendRecipe);
	document.querySelector("#confirmed").style.display="none";
	getRecipeList();
});


	//populate the recipe list dropdown by requesting data from the server
	//adds a bunch of: <option value="recipe_name.json">recipe name</option>	
function getRecipeList(){
	console.log("Requesting all recipe names");
	
	//request list of names
	$.ajax({method: "GET", 
				url: "/recipes",
				dataType:"json",
				success:function(data){
					//data is expected to an object like...
					//{names: [name1, name2, ...]}
								
					if(data.names && data.names.length>0){  //non empty list?
						
						var $dropdown = $("#recipeSelect");
						$dropdown.html('');//clear dropdown
						
						//populate dropdown
						for(var i=0;i<data.names.length;i++){
							$dropdown.append("<option value='"+data.names[i]+"'>"
															+data.names[i].split("_").join(" ")
															+"</option>");
						}
					}
				}
	});
}

//Sends a request to the server for the currently selected recipe (in the recipeSelect dropdown)
//If successfull will populate the other fields on the page with the recipe data
function viewRecipe(){
	
	var name = $("#recipeSelect option:selected").val();  //get the value of the selected option from recipeSelect
	console.log("Requesting recipe: "+name);
	//fetch and load the recipe
	$.ajax({method:"GET",
				url: "/recipe/"+name,
				dataType:"json",
				success: function(data){
					console.log("Loading recipe into form: ",data);
					
					//fill in form		
					$("#recipeName").val(data.name.split("_").join(" "));
					$("#recipeDuration").val(data.duration);
					$("#recipeIngredients").val(data.ingredients);
					$("#recipeDirections").val(data.directions);
					$("#recipeNotes").val(data.notes);
				},
				cache:false
	});
}


//Sends a POST request to the server to add/update a recipe to the 
//database. Note: contents are not checked for safety!
//Note: recipe names are stored with underscores in place of spaces.
//			but this is done transparently to the client.
function sendRecipe(){
	console.log("Sending new recipe");
	
	//get recipe from page
	var recipe = {
		name: $("#recipeName").val().split(" ").join("_"),
		duration: $("#recipeDuration").val(),
		//ingredients: $("#recipeIngredients").val().split("\n"),
		ingredients: $("#recipeIngredients").val(),
		//directions: $("#recipeDirections").val().split("\n"),
		directions: $("#recipeDirections").val(),
		notes: $("#recipeNotes").val()
	}
	
	//send recipe
	$.ajax({method:"POST",
				url:"/recipe",
				data:recipe,
				success:function(data){
					//show/hide checkmark div
					document.querySelector("#confirmed").style.display="inline";
					//document.querySelector("#confirmed").append("&#9986;");
					setTimeout(function(){
						document.querySelector("#confirmed").style.display="none";
						//document.querySelector("#confirmed").append(" ");
					},3000);
					$("#recipeName").val("");
					$("#recipeDuration").val("");
					$("#recipeIngredients").val("");
					$("#recipeDirections").val("");
					$("#recipeNotes").val("");
					getRecipeList();  //refresh dropdown
				}
	});
}
