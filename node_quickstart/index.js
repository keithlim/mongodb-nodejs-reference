const { MongoClient } = require("mongodb");

// Replace the uri string with your MongoDB deployment's connection string.
const uri = "";

const client = new MongoClient(uri, { useUnifiedTopology: true });

async function run() {
    try {
        await client.connect();

        const database = client.db("sample_mflix");
        const movies = database.collection("movies");

        // FIND OPERATIONS

        /////
        // Query for a movie that has the title 'The Room'
        const query = { title: "The Room" };
        const options = {
            // sort matched documents in descending order by rating
            sort: { rating: -1 },
            // Include only the `title` and `imdb` fields in the returned document
            projection: { _id: 0, title: 1, imdb: 1 },
        };
        const movie = await movies.findOne(query, options);
        // since this method returns the matched document, not a cursor, print it directly
        console.log(movie);
        /////

        /////
        // query for movies that have a runtime less than 15 minutes
        const query = { runtime: { $lt: 15 } };
        const options = {
            // sort returned documents in ascending order by title (A->Z)
            sort: { title: 1 },
            // Include only the `title` and `imdb` fields in each returned document
            projection: { _id: 0, title: 1, imdb: 1 },
        };
        const cursor = movies.find(query, options);
        // print a message if no documents were found
        if ((await cursor.count()) === 0) {
            console.log("No documents found!");
        }
        // replace console.dir with your callback to access individual elements
        await cursor.forEach(console.dir);
        /////

        // INSERT OPERATIONS

        /////
        // create a document to be inserted
        const doc = { name: "Red", town: "kanto" };
        const result = await movies.insertOne(doc);
        console.log(
            `${result.insertedCount} documents were inserted with the _id: ${result.insertedId}`,
        );
        /////

        /////
        // create an array of documents to insert
        const docs = [
            { name: "Red", town: "Kanto" },
            { name: "Blue", town: "Kanto" },
            { name: "Leon", town: "Galar" }
        ];
        // this option prevents additional documents from being inserted if one fails
        const options = { ordered: true };
        const result = await movies.insertMany(docs, options);
        console.log(`${result.insertedCount} documents were inserted`);
        /////

        // UPDATE & REPLACE OPERATIONS

        /////
        // create a filter for a movie to update
        const filter = { title: "Blacksmith Scene" };
        // this option instructs the method to create a document if no documents match the filter
        const options = { upsert: true };
        // create a document that sets the plot of the movie
        const updateDoc = {
            $set: {
                plot:
                    "Blacksmith Scene is a silent film directed by William K.L. Dickson",
            },
        };
        const result = await movies.updateOne(filter, updateDoc, options);
        console.log(
            `${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`,
        );
        /////

        /////
        // create a filter to update all movies with a 'G' rating
        const filter = { rated: "G" };
        // increment every document matching the filter with 2 more comments
        const updateDoc = {
            $inc: {
                num_mflix_comments: 2,
            },
        };
        const result = await movies.updateMany(filter, updateDoc);
        console.log(result);
        /////

        /////
        // create a query for a movie to update
        const query = { title: "Blacksmith Scene" };
        const options = {
            // create a document if no documents match the query
            upsert: true,
        };
        // create a new document that will be used to replace the existing document
        const replacement = {
            title: "Sandcastles in the Sand",
            plot:
                "Robin Sparkles mourns for a relationship with a mall rat at an idyllic beach.",
        };
        const result = await movies.replaceOne(query, replacement, options);
        if (result.modifiedCount === 0 && result.upsertedCount === 0) {
            console.log("No changes made to the collection.");
        } else {
            if (result.matchedCount === 1) {
                console.log("Matched " + result.matchedCount + " documents.");
            }
            if (result.modifiedCount === 1) {
                console.log("Updated one document.");
            }
            if (result.upsertedCount === 1) {
                console.log(
                    "Inserted one new document with an _id of " + result.upsertedId._id
                );
            }
        }
        /////

        // DELETE OPERATIONS

        /////   
        // Query for a movie that has a title of type string
        const query = { title: { $type: "string" } };
        const result = await movies.deleteOne(query);
        if (result.deletedCount === 1) {
            console.dir("Successfully deleted one document.");
        } else {
            console.log("No documents matched the query. Deleted 0 documents.");
        }
        /////

        /////
        // Query for all movies with the title "Santa Claus"
        const query = { title: "Santa Claus" };
        const result = await movies.deleteMany(query);
        console.log("Deleted " + result.deletedCount + " documents");
        /////

        // COUNT DOCUMENTS

        /////
        // Estimate the total number of documents in the collection
        // and print out the count.
        const estimate = await movies.estimatedDocumentCount();
        console.log(`Estimated number of documents in the movies collection: ${estimate}`);
        // Query for movies from Canada.
        const query = { countries: "Canada" };
        // Find the number of documents that match the specified
        // query, (i.e. with "Canada" as a value in the "countries" field)
        // and print out the count.
        const countCanada = await movies.countDocuments(query);
        console.log(`Number of movies from Canada: ${countCanada}`);
        /////

        // RETRIEVE DISTINCT VALUES OF A FIELD

        /////
        // specify the document field
        const fieldName = "year";
        // specify an optional query document
        const query = { directors: "Barbra Streisand" };
        const distinctValues = await movies.distinct(fieldName, query);
        console.log(distinctValues);
        /////

        // RUN A COMMAND

        /////
        const result = await database.command({
            dbStats: 1,
        });
        console.log(result);
        /////

        // WATCH FOR CHANGES

        /////
        // open a Change Stream on the "movies" collection
        changeStream = movies.watch();
        // set up a listener when change events are emitted
        changeStream.on("change", next => {
            // process any change event
            console.log("received a change to the collection: \t", next);
        });
        // use a timeout to ensure the listener is registered before the insertOne
        // operation is called.
        await new Promise(resolve => {
            setTimeout(async () => {

                await movies.insertOne({
                    test: "sample movie document",
                });

                // wait to close `changeStream` after the listener receives the event
                setTimeout(async () => {
                    resolve(await changeStream.close());
                }, 1000);

            }, 1000);
        });
        /////

        // PERFORM BULK OPERATIONS

        /////
        const theaters = database.collection("theaters");
        const result = await theaters.bulkWrite([
            {
                insertOne:
                {
                    "document": {
                        location: {
                            address: { street1: '3 Main St.', city: 'Anchorage', state: 'AK', zipcode: '99501' },
                        }
                    }
                }
            },
            {
                insertOne:
                {
                    "document": {
                        location: {
                            address: { street1: '75 Penn Plaza', city: 'New York', state: 'NY', zipcode: '10001' },
                        }
                    }
                }
            },
            {
                updateMany:
                {
                    "filter": { "location.address.zipcode": "44011" },
                    "update": { $set: { "street2": "25th Floor" } },
                    "upsert": true
                }
            },
            {
                deleteOne:
                    { "filter": { "location.address.street1": "221b Baker St" } }
            },
        ]);
        console.log(result);
        /////

    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}
run().catch(console.dir);