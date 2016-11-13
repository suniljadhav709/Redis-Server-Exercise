const express = require('express');
const router = express.Router();
const recipeData = require("../../recipe-data");
const uuid = require("node-uuid");
const redis = require('redis');
const redis_client = redis.createClient();
var cache = require('express-redis-cache')();
const jwt = require("jsonwebtoken");

function clear_redis() {
    redis_client.setex('allrecipes', 1, {});
    redis_client.setex('allusers', 1, {});
}
//clear_redis();

router.get("/", (req, res) => {
    //console.log('Getting all recepies.');

    redis_client.get('allrecipes', function(error, result) {
        if (!result) {
            console.log(' --------------------- ');
            console.log(' Cache for all recipes was not found. Going to retrive and update cache');

            return recipeData.getAllRecipes().then((recipeList) => {

                    return recipeData.getAllUsers().then(function(users) {
                        //console.log("all users from worker fucntion : " + JSON.stringify(users));
                        var get_all_result = [];
                        recipeList.forEach(function(recipe) {
                            var record = {};
                            record.id = recipe.id;
                            record.title = recipe.title;
                            record.creatorDd = recipe.userid;
                            var isFound = false;
                            users.forEach(function(user) {
                                if (!isFound && user.id == recipe.userid) {
                                    record.creatorName = user.username;
                                    isFound = true;
                                }
                            }, this);
                            get_all_result[get_all_result.length] = record;
                        }, function(error) {
                            //console.log("Error while getting all users : " + error);
                            return res.json({ 'Error': error, 'status': 'failure' });
                        });
                        //return res.json(get_all_result);
                        console.log('Updating cache for All recipes');

                        console.log('No cache for recipes.');
                        console.log(' --------------------- ');
                        console.log('Suggested new cache : ' + JSON.stringify(recipeList));
                        console.log(' --------------------- ');
                        redis_client.setex('allrecipes', (60 * 60), JSON.stringify(recipeList));

                        return res.json(get_all_result);

                    }, function(error) {
                        //console.log("Error while getting all users : " + error);
                        return res.json({ 'Error': error, 'status': 'failure' });
                    });
                    //res.json(recipeList);
                })
                .catch(() => {
                    // Something went wrong with the server!
                    res.sendStatus(500);
                });
        } else {
            //console.log(' --------------------- ');
            //console.log('Cache present.');
            //console.log(' --------------------- ');
            var recipeList = [];
            recipeList = JSON.parse(result);
            //console.log('Recipes from Cache : ' + recipeList);
            //console.log(' --------------------- ');
            return recipeData.getAllUsers().then(function(users) {
                //console.log("all users from worker fucntion : " + JSON.stringify(users));
                //console.log('Got users from data base : ' + JSON.stringify(users));
                //console.log(' --------------------- ');
                var get_all_result = [];
                recipeList.forEach(function(recipe) {
                    console.log('Working on ' + recipe);
                    var record = {};
                    record.id = recipe.id;
                    record.title = recipe.title;
                    record.creatorId = recipe.userid;
                    var isFound = false;
                    users.forEach(function(user) {
                        if (!isFound && user.id == recipe.userid) {
                            record.creatorName = user.username;
                            isFound = true;
                        }
                    }, this);
                    get_all_result[get_all_result.length] = record;
                }, this);

                return res.json(get_all_result);

            }, function(error) {
                //console.log("Error while getting all users : " + error);
                return res.json({ 'Error': error, 'status': 'failure' });
            });
        }
    });

});

router.get("/:id", (req, res) => {
    var _id = req.params.id;

    var token = req.headers['auth-token'];
    //console.log('Getting recepie with id : ' + _id + " and token : " + token);
    if (!token) {
        recipeData.getAllRecipes().then((recipeList) => {
            //console.log(' ************************************ ');
            //console.log(' Recipes :  ' + JSON.stringify(recipeList));
            //console.log(' ************************************ ');
            var _recipe = {};
            var _creator = {};
            var isFound = false;
            recipeList.forEach(function(element) {
                //console.log(' Recipe Name :  ' + element.title);
                if (element.id == _id) {
                    _recipe = element;
                    //console.log('Recipe : ' + element.title + ' with id :  ' + element.id + ' == ' + _id);
                    //console.log(' ************************************ ');
                    //console.log('Recipe found');
                    isFound = true;
                } else {
                    //console.log('Recipe : ' + element.title + ' with id :  ' + element.id + ' != ' + _id);
                    //console.log(' ************************************ ');
                }
            }, this);
            if (isFound) {
                //console.log('Finding User');
                recipeData.getAllUsers().then(function(users) {

                    users.forEach(function(user) {

                        if (user.id == _recipe.userid) {
                            //console.log('User found');

                            _creator = user;
                            //console.log('User : ' + user.username + ' with id :  ' + user.id + ' is equal to ' + _creator.id);
                        } else {
                            //console.log('User : ' + user.username + ' with id :  ' + user.id + ' is NOT equal to ' + _recipe.userid);
                        }
                    });
                    //console.log(' ------------------------------------- ');
                    //console.log(' selected creator : ' + JSON.stringify(_creator));
                    res.json({ creator: _creator, recipe: _recipe });
                });

            } else {
                res.json({ creator: _creator, recipe: _recipe });
            }
        });
    } else {
        //console.log(' ************************************ ');
        //console.log('Token present');
        var user_uuid = ''; //validate_user(req.app.get('superSecret'), token);
        jwt.verify(token, req.app.get('superSecret'), function(err, decoded) {
            if (err) {
                return res.json({ status: 'failure', message: err });
            } else {

                var decoded_json = JSON.parse(JSON.stringify(decoded));
                //console.log('Decoded Json from Token : ' + decoded_json);
                //console.log(' ************************************ ');
                //console.log(' Decoded user id : ' + decoded_json.id);
                //console.log(' ************************************ ');
                user_uuid = decoded_json.id;
                if (!user_uuid) {
                    res.json({ status: 'failure', message: 'token invalid' });
                } else {
                    //console.log(' Going to Fetch all recipes. ');
                    //console.log(' ************************************ ');
                    // -----------------
                    recipeData
                        .getAllRecipes()
                        .then((recipeList) => {
                            var recipe = {};
                            var isFound = false;
                            //console.log(' Recipes :  ' + JSON.stringify(recipeList));
                            //console.log(' ************************************ ');
                            recipeList.forEach(function(element) {

                                if (element.id == _id) {
                                    recipe = element;
                                    isFound = true;
                                }
                            }, this);
                            if (isFound) {
                                //console.log(' Found the recipe : ' + JSON.stringify(recipe));
                                //console.log(' ************************************ ');
                                recipeData.getAllUsers().then(function(users) {
                                    users.forEach(function(user) {

                                        if (user.id == user_uuid) {
                                            var user_hidden_info = user;
                                            //console.log(' Found current user : ' + JSON.stringify(user));
                                            //console.log(' ************************************ ');
                                            //console.log('Updating cache for View History');
                                            redis_client.get(user.id, function(error, result) {
                                                if (result) {
                                                    //console.log(' Cuurent USER Cache : ' + result);
                                                    var user_info = JSON.parse(result);
                                                    //console.log(' ------------------------------------- ');
                                                    //console.log('View History : ' + user_info.viwed);
                                                    //console.log(' ------------------------------------- ');
                                                    var arr = user_info.viwed == undefined ? [] : user_info.viwed;
                                                    if (arr.length == 9) {
                                                        arr.splice(0, 1);
                                                    }
                                                    arr[arr.length] = recipe;
                                                    user.viwed = arr;
                                                    //console.log('Updated View History : ' + JSON.stringify(user.viwed));
                                                    ///console.log(' ------------------------------------- ');
                                                    redis_client.setex(user.id, (5 * 60), JSON.stringify(user));
                                                } else {
                                                    //console.log(' ------------------------------------- ');
                                                    //console.log('View History : ' + 'Empty');
                                                    var arr = [];
                                                    arr[arr.length] = recipe;
                                                    user.viwed = arr;
                                                    //console.log(' ------------------------------------- ');
                                                    //console.log('Updated View History : ' + user.viwed);
                                                    //console.log(' ------------------------------------- ');
                                                    redis_client.setex(user.id, (5 * 60), JSON.stringify(user));
                                                }
                                                res.json({ Recipe: recipe, creator: user_hidden_info });
                                            });
                                        }
                                    }, this);

                                }, function(err) {
                                    res.json({ status: 'failure', error: err });
                                });

                            } else
                                res.json({ status: 'failure', message: 'there is no record with such id' });
                        })
                        .catch(() => {
                            // Something went wrong with the server!
                            res.sendStatus(500);
                        });
                    // ------------------------

                }
            }
        });
    }

});


router.post("/", (req, res) => {
    var token = req.headers['auth-token'];

    if (!token) {
        return res.json({
            status: 'failed',
            message: 'Auth-Toeken as missing. please Auth-Token in header. for Auth-Token you need to authenticate.'
        });
    } else {
        var user_uuid = ''; //validate_user(req.app.get('superSecret'), token);
        jwt.verify(token, req.app.get('superSecret'), function(err, decoded) {
            //console.log('@ delete user with decoded token : ' + decoded);
            if (err) {
                return res.json({ status: 'failure', message: err });
            } else {

                var decoded_json = JSON.parse(JSON.stringify(decoded));
                //console.log('Decoded Json from Token : ' + decoded_json);
                user_uuid = decoded_json.id;
                if (!user_uuid) {
                    res.json({ status: 'failure', message: 'token invalid' });
                } else {
                    var _uuid = uuid.v4();
                    var json_recipe = {
                        id: _uuid,
                        userid: user_uuid,
                        title: req.body.title,
                        description: req.body.description,
                        ingredients: req.body.ingredients,
                        steps: req.body.steps,
                        relatedRecipes: req.body.relatedRecipes,
                        imageUrls: req.body.imageUrls
                    };
                    //console.log('***********************');
                    //console.log('Creating Recipe : ' + JSON.stringify(json_recipe));
                    //console.log('***********************');
                    var newRecipe = json_recipe;

                    var redisConnection = req
                        .app
                        .get("redis");

                    var messageId = uuid.v4();
                    var killswitchTimeoutId = undefined;

                    redisConnection.on(`recipe-created:${messageId}`, (insertedRecipe, channel) => {
                        //console.log('Message recipe-created received from worker function ');
                        // ------------------------- Caching start --------------------
                        if (insertedRecipe.status == 'success') {
                            redis_client.get('allrecipes', function(error, result) {
                                if (result) {

                                    var recipes = JSON.parse(result);
                                    recipes[recipes.length] = insertedRecipe.result;
                                    //console.log('New allusers for cache : ' + JSON.stringify(recipes));
                                    redis_client.setex('allrecipes', (60 * 60), JSON.stringify(recipes));
                                    //console.log('Update complete .............!');
                                } else {
                                    //console.log('Adding allrecipes to cache');
                                    var recipes = [];
                                    recipes[recipes.length] = insertedRecipe.result;
                                    redis_client.setex('allrecipes', (60 * 60), JSON.stringify(recipes));
                                }
                                //console.log('Caching new user');
                                redis_client.setex(insertedRecipe.result.id, (60 * 60), JSON.stringify(insertedRecipe.result));
                                //console.log('Update complete .............!')
                            });
                        }
                        // ------------------------- Caching -----------------------------
                        res.json(insertedRecipe);
                        redisConnection.off(`recipe-created:${messageId}`);
                        redisConnection.off(`recipe-created-failed:${messageId}`);

                        clearTimeout(killswitchTimeoutId);
                    });

                    redisConnection.on(`recipe-created-failed:${messageId}`, (error, channel) => {
                        res
                            .status(500)
                            .json(error);

                        redisConnection.off(`recipe-created:${messageId}`);
                        redisConnection.off(`recipe-created-failed:${messageId}`);

                        clearTimeout(killswitchTimeoutId);
                    });

                    killswitchTimeoutId = setTimeout(() => {
                        redisConnection.off(`recipe-created:${messageId}`);
                        redisConnection.off(`recipe-creation-failed:${messageId}`);
                        res
                            .status(500)
                            .json({ error: "Timeout error" })
                    }, 5000);

                    redisConnection.emit(`create-recipe:${messageId}`, {
                        //console.log('Emiting message for creating recipe.');
                        requestId: messageId,
                        recipe: newRecipe
                    });
                }
            }
        });
    }



});

router.put('/:id', (req, res) => {
    var token = req.headers['auth-token'];
    if (!token) {
        return res.json({
            status: 'failed',
            message: 'Auth-Toeken as missing. please Auth-Token in header. for Auth-Token you need to authenticate.'
        });
    } else {
        var user_uuid = ''; //validate_user(req.app.get('superSecret'), token);
        jwt.verify(token, req.app.get('superSecret'), function(err, decoded) {
            //console.log('@ delete user with decoded token : ' + decoded);
            if (err) {
                return res.json({ status: 'failure', message: err });
            } else {

                var decoded_json = JSON.parse(JSON.stringify(decoded));
                //console.log('Decoded Json from Token : ' + decoded_json);
                user_uuid = decoded_json.id;
                if (!user_uuid) {
                    res.json({ status: 'failure', message: 'token invalid' });
                } else {
                    var title = req.body.title;
                    if (!title) {
                        return res.json({ status: 'failure', message: 'title can not be empty' });
                    } else {
                        //console.log('Body : ' + req.body.title)
                        var newRecipe = {
                            id: req.params.id,
                            title: req.body.title,
                            description: req.body.description,
                            ingredients: req.body.ingredients,
                            steps: req.body.steps,
                            relatedRecipes: req.body.relatedRecipes,
                            imageUrls: req.body.imageUrls
                        };

                        var redisConnection = req
                            .app
                            .get("redis");

                        var messageId = uuid.v4();
                        var killswitchTimeoutId = undefined;

                        redisConnection.on(`recipe-updated:${messageId}`, (updatedRecipe, channel) => {
                            console.log('Message recipe-updated received from worker function : ' + JSON.stringify(updatedRecipe));
                            // Caching start ----------------------
                            if (updatedRecipe.status == 'success') {
                                redis_client.get('allrecipes', function(error, result) {
                                    if (result) {

                                        var recipes = JSON.parse(result);
                                        recipes[recipes.length] = updatedRecipe.result;
                                        //console.log('New allusers for cache : ' + JSON.stringify(recipes));
                                        redis_client.setex('allrecipes', (60 * 60), JSON.stringify(recipes));
                                        //console.log('Update complete .............!');
                                    } else {
                                        //console.log('Adding allrecipes to cache');
                                        var recipes = [];
                                        recipes[recipes.length] = updatedRecipe.result;
                                        redis_client.setex('allrecipes', (60 * 60), JSON.stringify(recipes));
                                    }
                                    //console.log('updating recipe cache ');
                                    redis_client.get(updatedRecipe.result.id, function(error, result) {
                                        if (result) {
                                            redis_client.setex(update_result.result.id, (60 * 60), JSON.stringify(update_result.result), function(redis_err, res) {
                                                //console.log('redis cache upadte error : ' + redis_err);
                                                //console.log('redis cache upadte result : ' + res);
                                            });
                                        }
                                    });
                                    //console.log('Update complete .............!')
                                });

                            }
                            // Caching end ----------------------

                            res.json(updatedRecipe);
                            redisConnection.off(`recipe-updated:${messageId}`);
                            redisConnection.off(`recipe-updated-failed:${messageId}`);

                            clearTimeout(killswitchTimeoutId);
                        });

                        redisConnection.on(`recipe-updated-failed:${messageId}`, (error, channel) => {
                            res
                                .status(500)
                                .json(error);

                            redisConnection.off(`recipe-updated:${messageId}`);
                            redisConnection.off(`recipe-updated-failed:${messageId}`);

                            clearTimeout(killswitchTimeoutId);
                        });

                        killswitchTimeoutId = setTimeout(() => {
                            redisConnection.off(`recipe-updated:${messageId}`);
                            redisConnection.off(`recipe-updation-failed:${messageId}`);
                            res
                                .status(500)
                                .json({ error: "Timeout error" })
                        }, 5000);

                        redisConnection.emit(`update-recipe:${messageId}`, {
                            //console.log('Emiting message for creating recipe.');
                            requestId: messageId,
                            recipe: newRecipe,
                            userid: user_uuid
                        });
                    }
                }
            }
        });
    }

});

router.delete('/:id', (req, res) => {

    var token = req.headers['auth-token'];
    if (!token) {
        return res.json({
            status: 'failed',
            message: 'Auth-Toeken as missing. please Auth-Token in header. for Auth-Token you need to authenticate.'
        });
    } else {
        var user_uuid = ''; //validate_user(req.app.get('superSecret'), token);
        jwt.verify(token, req.app.get('superSecret'), function(err, decoded) {
            //console.log('@ delete user with decoded token : ' + decoded);
            if (err) {
                return res.json({ status: 'failure', message: err });
            } else {

                var decoded_json = JSON.parse(JSON.stringify(decoded));
                //console.log('Decoded Json from Token : ' + decoded_json);
                user_uuid = decoded_json.id;
                if (!user_uuid) {
                    res.json({ status: 'failure', message: 'token invalid' });
                } else {
                    // ---------------------------
                    var _id = req.params.id; //validate_user(req.app.get('superSecret'), token);
                    //console.log('************* ID : ' + _id);
                    if (!_id) {
                        res.json({ status: 'failure', message: 'Id passed is null' });
                    } else {
                        // var ID = req.params.id;
                        // var redisConnection = req
                        //     .app
                        //     .get("redis");

                        // var messageId = uuid.v4();
                        // var killswitchTimeoutId = undefined;
                        // console.log('************* ID : ' + _id);
                        // redisConnection.on(`recipe-deleted:${messageId}`, (delete_status, channel) => {
                        //     console.log(' ******************************** ');
                        //     console.log('Delete Status : ' + JSON.stringify(delete_status));
                        //     console.log(' ******************************** ');
                        //     // ----------------- Update Cache
                        //     console.log(' ******************************** ');
                        //     //     console.log('Delete Status : ' + JSON.stringify(delete_status));
                        //     //     console.log(' ******************************** ');
                        //     //     // ----------------- Update Cache
                        //     //     console.log('going to clear recipe from cache');
                        //     //     var deleted_recipe_id = req.params.id;
                        //     //     var creator_id = user_uuid;
                        //     //     redis_client.setex(req.params.id, 1, {});
                        //     //     return res.json({ message: 'deleted' });
                        //     console.log('going to clear recipe from cache');
                        //     var deleted_recipe_id = delete_status.id;
                        //     var creator_id = delete_status.userid;
                        //     redis_client.setex(deleted_recipe_id, 1, {});
                        //     res.json(delete_status);
                        //     redisConnection.off(`recipe-deleted:${messageId}`);
                        //     redisConnection.off(`recipe-deleted-failed:${messageId}`);

                        //     clearTimeout(killswitchTimeoutId);


                        //     // ----------------- Update Cache  

                        // });

                        // redisConnection.on(`recipe-deleted-failed:${messageId}`, (error, channel) => {
                        //     res
                        //         .status(500)
                        //         .json(error);

                        //     redisConnection.off(`recipe-deleted:${messageId}`);
                        //     redisConnection.off(`recipe-deleted-failed:${messageId}`);

                        //     clearTimeout(killswitchTimeoutId);
                        // });

                        // killswitchTimeoutId = setTimeout(() => {
                        //     redisConnection.off(`recipe-deleted:${messageId}`);
                        //     redisConnection.off(`recipe-deleted-failed:${messageId}`);
                        //     res
                        //         .status(500)
                        //         .json({ error: "recipe deletion Operation : Timeout error" })
                        // }, 5000);

                        // redisConnection.emit(`delete-recipe:${messageId}`, {
                        //     //console.log('Emiting message for creating recipe.');
                        //     requestId: messageId,
                        //     id: ID,
                        //     userid: user_uuid
                        // });
                        return recipeData.delete_recipe(req.params.id, user_uuid).then(function(delete_status) {

                            // ----------------- Update Cache
                            //console.log('going to clear recipe from cache');
                            var deleted_recipe_id = req.params.id;
                            var creator_id = user_uuid;
                            redis_client.setex(req.params.id, 1, {});
                            return res.json({ message: 'Operation Executed' });

                        });
                    }

                    // ---------------------------
                }
            }
        });
    }


});



module.exports = router;