const express = require('express');
const router = express.Router();
const recipeData = require("../../recipe-data");
const uuid = require("node-uuid");
const jwt = require("jsonwebtoken");

const redis = require('redis');

// create a new redis client and connect to our local redis instance
const redis_client = redis.createClient();


//router.use(middlewareCheck);


// POST : /users/session : authenticate user
router.post("/session", (req, res) => {

    var username = req.body.username;
    var password = req.body.password;

    if (username == "" || username == undefined || password == "" || password == undefined) {
        return res.json({
            status: 'failure',
            message: 'username or password was not provided in the body section',
            detailed: 'Syntax : { username : "your value", password : "your value"}'
        });
    } else {
        try {
            //console.log('trying to authenticate');
            recipeData.authenticate(username, password).then(
                function(result) {
                    //console.log('Authentication result @ session  route : ' + JSON.stringify(result));
                    if (result.status == 'success') {
                        var token_key = req.app.get('superSecret');
                        //console.log('token key : ' + token_key);
                        var token = '';

                        token = jwt.sign(result, token_key, {
                            expiresIn: 60 //expires in 5 min
                        });
                        //console.log('token assigned : ' + token);
                        res.json({
                            success: true,
                            message: 'authentication successful using token to communicate in future.',
                            token: token
                        });
                    } else {
                        //console.log('Rejecting Authentication with a problem');
                        return res.json(result);
                    }
                },
                function(err) {
                    return res.json({ error: err });
                });

        } catch (e) {
            console.log('error : ' + e);
            return { error: e };
        }
    }


});

router.delete("/", (req, res) => {

    var token = req.headers['auth-token'];

    if (!token) {
        return res.json({
            status: 'failed',
            message: 'Auth-Toeken as missing. please Auth-Token in header. for Auth-Token you need to authenticate.'
        });
    } else {
        var _uuid = ''; //validate_user(req.app.get('superSecret'), token);
        jwt.verify(token, req.app.get('superSecret'), function(err, decoded) {
            console.log('@ delete user with decoded token : ' + decoded);
            if (!decoded) {
                return res.json({ status: 'failure', message: 'invalid token' });
            }
            if (err) {
                uuid = undefined;
            } else {

                var decoded_json = JSON.parse(JSON.stringify(decoded));
                console.log('Decoded Json from Token : ' + decoded_json);
                _uuid = decoded_json.id;
                if (!_uuid) {
                    res.json({ status: 'failure', message: 'token invalid' });
                } else {
                    var redisConnection = req
                        .app
                        .get("redis");

                    var messageId = uuid.v4();
                    var killswitchTimeoutId = undefined;

                    redisConnection.on(`user-deleted:${messageId}`, (delete_status, channel) => {
                        console.log('User Deletion Status : ' + JSON.stringify(delete_status) + ' for user : ' + uuid);

                        if (delete_status.status == 'success') {
                            redis_client.get(uuid, function(error, result) {
                                if (result) {
                                    console.log('@Cache for user being deleted : ' + result + ' and uuid :' + uuid);
                                    redis_client.setex(uuid, 1, '');
                                }
                            });
                        }
                        res.json(delete_status);
                        redisConnection.off(`user-deleted:${messageId}`);
                        redisConnection.off(`user-deleted-failed:${messageId}`);

                        clearTimeout(killswitchTimeoutId);
                    });

                    redisConnection.on(`user-deleted-failed:${messageId}`, (error, channel) => {
                        res
                            .status(500)
                            .json(error);

                        redisConnection.off(`user-deleted:${messageId}`);
                        redisConnection.off(`user-deleted-failed:${messageId}`);

                        clearTimeout(killswitchTimeoutId);
                    });

                    killswitchTimeoutId = setTimeout(() => {
                        redisConnection.off(`user-deleted:${messageId}`);
                        redisConnection.off(`user-deleted-failed:${messageId}`);
                        res
                            .status(500)
                            .json({ error: "User deletion Operation : Timeout error" })
                    }, 5000);

                    redisConnection.emit(`delete-user:${messageId}`, {
                        //console.log('Emiting message for creating recipe.');
                        requestId: messageId,
                        uuid: _uuid
                    });

                }
            }
        });
    }
});

// PUT : /users : update user
router.put("/", (req, res) => {
    //console.log('updating user');

    var token = req.headers['auth-token'];

    if (!token) {
        return res.json({
            status: 'failed',
            message: 'Auth-Toeken as missing. please Auth-Token in header. for Auth-Token you need to authenticate.'
        });
    }
    var _uuid = ''; //validate_user(req.app.get('superSecret'), token);
    jwt.verify(token, req.app.get('superSecret'), function(err, decoded) {
        if (err) {
            uuid = undefined;
        } else {
            var decoded_json = JSON.parse(JSON.stringify(decoded));
            _uuid = decoded_json.id;
            if (!_uuid) {
                res.json({ status: 'failure', message: 'token invalid' });
            } else {
                var _username = req.body.username == undefined ? "" : req.body.username;
                var _password = req.body.password == undefined ? "" : req.body.password;
                var _email = req.body.email == undefined ? "" : req.body.email;
                var _phone = req.body.phone == undefined ? "" : req.body.phone;

                var redisConnection = req
                    .app
                    .get("redis");

                var messageId = uuid.v4();
                var killswitchTimeoutId = undefined;

                redisConnection.on(`user-updated:${messageId}`, (update_result, channel) => {
                    //console.log('Updating cache for user with id : ' + update_result.id);
                    if (update_result.status == 'success') {
                        redis_client.get(update_result.id, function(error, result) {
                            if (result) {
                                update_result.password = '*********';
                                redis_client.setex(update_result.id, (5 * 60), JSON.stringify(update_result));
                            }
                        });
                    }
                    res.json(update_result);
                    redisConnection.off(`user-updated:${messageId}`);
                    redisConnection.off(`user-updated-failed:${messageId}`);

                    clearTimeout(killswitchTimeoutId);
                });

                redisConnection.on(`user-updated-failed:${messageId}`, (error, channel) => {
                    res
                        .status(500)
                        .json(error);

                    redisConnection.off(`user-updated:${messageId}`);
                    redisConnection.off(`user-updated-failed:${messageId}`);

                    clearTimeout(killswitchTimeoutId);
                });

                killswitchTimeoutId = setTimeout(() => {
                    redisConnection.off(`user-updated:${messageId}`);
                    redisConnection.off(`user-update-failed:${messageId}`);
                    res
                        .status(500)
                        .json({ error: "User Creation Operation : Timeout error" })
                }, 5000);

                redisConnection.emit(`update-user:${messageId}`, {
                    //console.log('Emiting message for creating recipe.');
                    requestId: messageId,
                    uuid: _uuid,
                    username: _username,
                    password: _password,
                    email: _email,
                    phone: _phone
                });
            }
        }
    });


});

// GET : /users : get individual user
router.get("/:id", (req, res) => {
    var user_id = req.params.id;
    redis_client.get(user_id, function(error, result) {
        if (result) {
            //console.log('Got results from redis cache ');
            //console.log('User : ' + JSON.stringify(JSON.parse(result)));
            return res.json(JSON.parse(result));
        } else {
            recipeData.getUser(user_id).then(function(user) {
                redis_client.setex(user_id, (5 * 60), JSON.stringify(user));
                console.log('Caching data to redis ');
                return res.json(user);
            }, function(err) {
                return res.json({ "status": "failure", 'error': err });
            });
        }
    });

});


// GET : /users : get all users
router.get("/", (req, res) => {
    redis_client.get('allusers', function(error, result) {
        if (result) {
            console.log('Getting all users from cache');
            var users = JSON.parse(result);
            console.log('Users : ' + result);
            return res.json(users);
        } else {
            console.log('Caching all users to cache');
            console.log('Getting all recepies.');
            recipeData.getAllUsers().then(function(users) {
                console.log("all users from worker fucntion : " + JSON.stringify(users));
                redis_client.setex("allusers", (10 * 60), JSON.stringify(users));
                return res.json(users);
            }, function(error) {
                console.log("Error while getting all users : " + error);
                return res.json({ 'Error': error, 'status': 'failure' });
            });
        }
    });

});

// "POST : /users " : creation of user
router.post("/", (req, res) => {
    // creatng new user
    var _username = req.body.username;
    var _password = req.body.password;
    var _email = req.body.email;
    var _phone = req.body.phone;
    var primary_id = uuid.v4();

    var _user = {
        id: primary_id,
        username: _username,
        password: _password,
        email: _email,
        phone: _phone
    };
    var redisConnection = req
        .app
        .get("redis");

    var messageId = uuid.v4();
    var killswitchTimeoutId = undefined;

    redisConnection.on(`user-created:${messageId}`, (new_user, channel) => {
        console.log('Message user-created received from worker function ');
        console.log('POST/USER result : ' + JSON.stringify(new_user));
        if (new_user.status == 'failure') {
            console.log(' ***************** ');
            res.json(new_user);
            redisConnection.off(`user-created:${messageId}`);
            redisConnection.off(`user-created-failed:${messageId}`);

            clearTimeout(killswitchTimeoutId);
        } else {
            // CACHING ---------------
            console.log('working on caching new user : ' + JSON.stringify(new_user));

            redis_client.get('allusers', function(error, result) {
                if (result) {

                    var users = JSON.parse(result);
                    users[users.length] = new_user;
                    console.log('New allusers for cache : ' + users);
                    redis_client.setex('allusers', (10 * 60), JSON.stringify(users));
                    console.log('Update complete .............!');
                } else {
                    console.log('Adding allusers to cache');
                    var users = [];
                    users[users.length] = new_user;
                    redis_client.setex('allusers', (10 * 60), JSON.stringify(users));
                }
                console.log('Caching new user');
                redis_client.setex(new_user.id, (5 * 60), JSON.stringify(new_user));
                console.log('Update complete .............!')
            });
            // CACHING ---------------
            console.log(' ***************** ');
            res.json(new_user);
            redisConnection.off(`user-created:${messageId}`);
            redisConnection.off(`user-created-failed:${messageId}`);

            clearTimeout(killswitchTimeoutId);

        }


    });

    redisConnection.on(`user-created-failed:${messageId}`, (error, channel) => {
        res
            .status(500)
            .json(error);

        redisConnection.off(`user-created:${messageId}`);
        redisConnection.off(`user-created-failed:${messageId}`);

        clearTimeout(killswitchTimeoutId);
    });

    killswitchTimeoutId = setTimeout(() => {
        redisConnection.off(`user-created:${messageId}`);
        redisConnection.off(`user-creation-failed:${messageId}`);
        res
            .status(500)
            .json({ error: "User Creation Operation : Timeout error" })
    }, 5000);

    redisConnection.emit(`create-user:${messageId}`, {
        //console.log('Emiting message for creating recipe.');
        requestId: messageId,
        user: _user
    });

});



module.exports = router;