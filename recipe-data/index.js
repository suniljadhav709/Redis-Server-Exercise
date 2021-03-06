//const recipeCollection = require("./recipeCollection");
//const userCollection = require("./userCollection");
var MongoClient = require('mongodb').MongoClient,
    settings = require('./config.js');

var ObjectId = require('mongodb').ObjectID;

var fullMongoUrl = settings.mongoConfig.serverUrl + settings.mongoConfig.database;
var exports = module.exports = {};

MongoClient.connect(fullMongoUrl)
    .then(function(db) {
        console.log('Ok trying to export methods.......!');
        var recipeCollection = db.collection("recipe");
        var userCollection = db.collection("user");

        function isDifferent(original_text, new_text) {
            return (new_text != original_text && new_text != "" && new_text != undefined);
        };

        exports.delete_user = function(uuid) {
            console.log('@ Data delete user with uuid : ' + uuid);
            return userCollection.remove({ id: uuid }, 1).then(
                function(param) {
                    console.log('Delete operation result : ' + JSON.stringify(param));
                    return { status: 'success', result: param };
                },
                function(err) {
                    return { status: 'failure', error: err };
                }
            );
        }



        exports.update_User = function(user_new) {

            return userCollection.find({ id: user_new.id }).limit(1).toArray().then(function(users) {

                    if (users.length > 0) {
                        console.log('********* OLD User : ' + JSON.stringify(users[0]));
                        console.log('********* NEW User : ' + JSON.stringify(user_new));
                        // --------------------------------------------
                        var user_upop = {};
                        var user_old = users[0];
                        // id
                        user_upop.id = user_old.id;

                        // user name
                        user_upop.username = isDifferent(user_old.username, user_new.username) ? user_new.username : user_old.username;

                        // password
                        user_upop.password = isDifferent(user_old.password, user_new.password) ? user_new.password : user_old.password;

                        // email
                        user_upop.email = isDifferent(user_old.email, user_new.email) ? user_new.email : user_old.email;

                        // phone
                        user_upop.phone = isDifferent(user_old.phone, user_new.phone) ? user_new.phone : user_old.phone; //
                        // ---------------------------------------

                        return userCollection.updateOne({
                            id: user_new.id
                        }, {
                            id: user_upop.id,
                            username: user_upop.username,
                            password: user_upop.password,
                            email: user_upop.email,
                            phone: user_upop.phone
                        }).then(function(param) {

                            console.log('Update RESULT : ' + param);
                            console.log('***** Update Result id : ' + user_upop.id);
                            return userCollection.find({ id: user_upop.id }).toArray().then(function(user) {
                                console.log('***** FINAL Update Result : ' + JSON.stringify(user));
                                var _user = user[0];
                                _user.status = 'success';
                                _user.password = "********";
                                console.log('***** FINAL Update Result : ' + JSON.stringify(_user));
                                return _user;
                            });

                            //return user_upop;


                        }, function(err) {
                            return { "status": "failure", "error": err };
                        });

                    } else {
                        return { 'status': 'failure', 'message': 'not such item exists.' };
                    }

                },
                function(err) {
                    console.log('@ Worker.getUser(uuid) ERROR : ' + err);
                    return {};
                });

        };

        function get_user(uuid) {
            //console.log('@ Worker.getUser(uuid) for uuid :  ' + uuid);
            return userCollection.find().toArray().then(function(users) {
                //console.log('Users from database : ' + JSON.stringify(users));
                var user = {};
                users.forEach(function(element) {
                    console.log(element._id + " being compared with " + uuid + " result : " + (element._id.toString().toLowerCase() == uuid.toString().toLowerCase()));

                    if ((element._id.toString().toLowerCase() == uuid.toString().toLowerCase())) {
                        user = element;
                        user.password = "*****";
                    }
                }, this);
                //console.log('Search result for user : ' + JSON.stringify(user));
                return user;
            }, function(err) {
                //console.log('@ Worker.getUser(uuid) ERROR : ' + err);
                return {};
            });

        };


        exports.authenticate = function(user_name, _password) {

            return userCollection.find({ username: user_name, password: _password }).toArray().then(
                function(users) {
                    if (users.length > 0) {
                        var user = users[0];
                        user.password = "******";
                        var result = {
                            id: user.id,
                            status: 'success'
                        };
                        return result;
                    } else {
                        return {
                            status: 'failure',
                            message: 'no record with these credentials.'
                        };
                    }
                },
                function(err) {
                    return {
                        status: 'failure',
                        message: 'error in execution.',
                        error: err
                    };
                });
        };

        exports.getUser = function(uuid) {
            return userCollection.find({ id: uuid }).toArray().then(function(users) {
                if (users.length > 0) {
                    var user = users[0];
                    user.password = "********";
                    return user;
                } else {
                    return { 'Search Result': 'no record with this id' };
                }

            }, function(err) {
                return { status: 'failure', error: err };
            });
        };

        exports.getAllUsers = function() {
            return userCollection.find().toArray().then((users) => {
                users.forEach(function(user) {
                    user.password = "*******";
                }, this);
                return users;
            });
        };

        exports.addUser = function(new_user) {
            //console.log('going to add new user ' + JSON.stringify(new_user));
            // --------------
            // console.log('All users Data from Database : ' + JSON.stringify(userCollection.find().toArray()));
            return userCollection.find({ username: new_user.username }).toArray().then(function(existing_user) {
                if (existing_user.length == 0) {
                    return userCollection.insertOne(new_user).then(
                        function(result) {
                            return userCollection.find({ id: new_user.id }).toArray().then(function(added_user) {
                                //console.log('********Insertion Result : ' + JSON.stringify(added_user[0]));
                                var new_user = added_user[0];
                                //return getUser(new_user.id);
                                new_user.status = "success";
                                new_user.password = "**********";
                                return new_user;
                            });
                        },
                        function(error) {
                            return { 'status': 'failure', 'error': error };
                        });
                } else {
                    console.log('User already present');
                    return { status: 'failure', message: 'user already present can not create a duplicate.' };
                }

            });

        };

        // ---------------------------------------------------
        exports.getAllRecipes = function() {
            return recipeCollection.find().toArray().then((recipes) => {
                //return recipes.find().toArray();
                return recipes;
            });
        };

        exports.getRecipe = function(_id) {
            console.log('Result for query findng by id : ' + _id);
            return recipeCollection.find().toArray().then((recipes) => {
                var myrecipe = {};
                var isFound = false;
                recipes.forEach(function(recipe) {
                    if (recipe.id == _id) {
                        myrecipe = recipe;
                        isFound = true;
                    }
                }, this);
                //return recipes.find().toArray();
                console.log('Result for query findng by id : ' + JSON.stringify(myrecipe));
                if (isFound) {
                    return { status: 'success', result: myrecipe };
                } else {
                    return { status: 'failure', result: 'There was no record with this id' };
                }
            });
        };

        exports.update_recipe = function(recipe, userid) {
            console.log('@Data : Recipe : ' + JSON.stringify(recipe));
            if (!recipe.id || !recipe.title) {

                return { status: 'failure', message: 'Id and title is mandatory.' };
            } else {
                return recipeCollection.find({ id: recipe.id }).toArray().then(function(recipes) {
                    if (recipes.length > 0 && recipes[0].userid == userid) {
                        recipe.userid = userid;
                        return recipeCollection.updateOne({ id: recipe.id }, recipe).then(function(_result) {
                            console.log('@Data Recipe Updated : ' + JSON.stringify(recipe));
                            return { status: 'success', result: recipe };
                        }, function(err) {
                            console.log('@Data Recipe Updated failed.');
                            return { status: 'failure', message: 'There was no record with this id' };
                        });
                    } else {
                        return { status: 'failure', message: 'Only owner can update the recipe' };
                    }
                }, function(err) {
                    return { status: 'failure', error: err };
                });
            }

        };

        exports.delete_recipe = function(_id, puserid) {
            var return_result = {
                id: _id,
                userid: puserid
            };
            console.log('ID : ' + _id);
            if (!_id) {
                return_result.status = 'failure';
                return_result.message = 'Id is mandatory';
                return return_result;
            } else {
                var ObjectId_str = "";
                return recipeCollection.find({ id: _id }).toArray().then(function(param) {
                        if (param.length > 0) {
                            if (param[0].userid == puserid) {
                                recipeCollection.remove({ id: _id }, 1).then(function(_result) {
                                    // return {
                                    //     status: 'success',
                                    //     result: _result,
                                    //     id: _id,
                                    //     userid: puserid
                                    // };
                                    return_result.status = 'success';
                                    return_result.result = _result;
                                    return return_result;
                                }, function(err) {
                                    return_result.status = 'failure';
                                    return_result.error = err;
                                    return return_result;

                                });
                            }
                        } else {
                            return_result.status = 'failure';
                            return_result.result = 'no record found'
                            return return_result;
                        }
                    },
                    function(err) {
                        return { status: 'failure', error: err };
                    }
                );
            }

        };

        exports.getRecipe = function(id) {
            return recipeCollection.find({ _id: id }).limit(1).toArray().then((recipes) => {
                return recipes.length > 0 ? recipes[0] : null;
            })
        };


        exports.addRecipe = function(recipe) {
            console.log('@Data : Recipe : ' + recipe);
            return recipeCollection.insertOne(recipe).then(function(_result) {
                return recipeCollection.find({ id: recipe.id }).toArray().then(function(recipe_new) {
                    return { status: 'success', result: recipe_new[0] };
                }, function(err) {
                    return { status: 'failure', message: err };
                });
            }, function(err) {
                return { status: 'failure', message: err };
            });
            // return recipeCollection.find().toArray().then((recipes) => {
            //     var newRecipe = JSON.parse(JSON.stringify(recipe));

            //     newRecipe.ingredients.forEach(ingredient => {
            //         ingredient.systemTitle = ingredient.displayTitle.toString();
            //     });

            //     newRecipe.relatedIngredients = [];
            //     newRecipe.imageUrls = [];
            //     console.log('2');
            //     return recipes.insertOne(recipe)
            // }).then((recipe) => {
            //     console.log('Adding recipe completed');
            //     return this.getRecipe(recipe.insertedId);
            // });

        };

        exports.createRecipeRelationship = function(firstRecipe, firstMatchAmount, secondRecipe, secondMatchAmount) {
            return recipeCollection.find().toArray().then((recipes) => {
                return recipes.updateOne({
                    _id: firstRecipe
                }, {
                    $addToSet: {
                        relatedRecipes: {
                            _id: secondRecipe,
                            amount: firstMatchAmount
                        }
                    }
                }).then(() => {
                    recipes.updateOne({
                        _id: secondRecipe
                    }, {
                        $addToSet: {
                            relatedRecipes: {
                                _id: firstRecipe,
                                amount: secondMatchAmount
                            }
                        }
                    })
                }).then(() => {
                    return recipes.find({
                        _id: [firstRecipe, secondRecipe]
                    })
                });
            });
        };

        exports.findRecipesWithIngredient = function(systemTitle) {
            return recipeCollection.find({ "ingredients.systemTitle": systemTitle }).toArray().then((recipes) => {
                return recipes;
            });
        };

        exports.findRecipesWithIngredients = function(systemTitles) {
            return recipeCollection.find({
                "ingredients.systemTitle": {
                    $in: systemTitles
                }
            }).toArray().then((recipes) => {
                return recipes;
            });
        };

        exports.addImagesToRecipe = function(recipeId, imageUrlArray) {
            return recipeCollection.updateOne({ _id: recipeId }, {
                $addToSet: { imageUrls: { $each: imageUrlArray } }
            }).then(() => {
                return this.getRecipe(recipeId);
            });
        };
    }, function(err) {
        console.log("connection error : " + err);
    });

//module.exports = exportedMethods;