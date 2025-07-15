import { MongoClient } from "../../deps.ts";

const dbUrl = Deno.env.get("MOVIE_MATCH_DB_URL");
export const mongoDbClient = new MongoClient(dbUrl);

export const openMongoDbConnection = async () => {
    await mongoDbClient.connect();
    return mongoDbClient.db("movie_match");
}

export const closeMongoDbConnection = async () => {
    await mongoDbClient.close();
}