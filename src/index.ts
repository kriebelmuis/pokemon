import express, { Request, Response } from "express";

import { pokemons, resetpokemons, loadpokemons } from "./mappokemon";
import PokemonRepository from "./pokemonrepo";
import fs from "fs";

const repository = new PokemonRepository();
const app = express();

var config = require("../config.json")

let i = 0;

interface PokemonRequest {
    type: string;
}

app.get("/", async (req: Request<PokemonRequest>, res: Response) => {
    let data;
    try {
        data = await repository.getpokemonbytype(req.query.type);
    } catch (err) {
        if (err instanceof Error) {
            res.send(err.message);
        } else {
            res.send("Unknown error has occured")
        }
    }
    res.send(data);
})

async function indexallpokemon() {
    resetpokemons();
    console.log("Indexing all pokemon")
    await repository.getpokemon(config.allPokemon);
    app.listen(80);
    await repository.writetofile("cache");
    console.log(`Finished indexing ${pokemons.length} pokemon`);
}

async function enumarablyindexallpokemon() {
    resetpokemons();
    while (i < config.requestMultiplier) {
        i++;
        await repository.getpokemon(config.toRequest);
        console.log(`Indexation progress: ${i}/${config.requestMultiplier}`);
    }
    app.listen(80);
    await repository.writetofile("cache");
    console.log(`Finished indexing ${pokemons.length} pokemon`);
}

fs.access("./cache.json", (err: any) => {
    if (err || config.forceCache) {
        console.log("No cache found, creating");
        indexallpokemon();
        return;
    }
    loadpokemons(require("../cache.json"));
    app.listen(80);
    console.log("Reading from cache");
})