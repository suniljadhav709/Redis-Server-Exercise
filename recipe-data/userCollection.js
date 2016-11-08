const MongoClient = require("mongodb").MongoClient;
const settings = {
    mongoConfig: {
        serverUrl: "mongodb://localhost:27017/",
        database: "recipeDatabase"
    }
};

var fullMongoUrl = settings.mongoConfig.serverUrl + settings.mongoConfig.database;
var _connection = undefined

var dbConnection = () => {
    if (!_connection) {
        _connection = MongoClient.connect(fullMongoUrl)
            .then((db) => {
                return db;
            });
    }

    return _connection;
};

/* This will allow you to have one reference to each collection per app */
/* Feel free to copy and paste this this */
var getCollectionFn = (collection) => {
    var _col = undefined;

    return () => {
        if (!_col) {
            _col = dbConnection().then(db => {
                return db.collection(collection);
            });
        }

        return _col;
    }
}

module.exports = getCollectionFn("users");