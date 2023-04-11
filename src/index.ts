import express, { Request, Response } from "express";

import { pokemons, resetpokemons } from "./mappokemon";
import PokemonRepository from "./pokemonrepo";
import fs from "fs";

const repository = new PokemonRepository();
const app = express();

let i = 0;
var allPokemon = 811;
var toRequest = 85;

interface PokemonRequest {
    type: string;
}

app.get("/", async (req: Request<PokemonRequest>, res: Response) => {
    let data;
    try {
        data = await repository.getpokemonbytype(req.query.type);
    } catch(err) {
        if (err instanceof Error) {
            res.send(err.message);
        } else {
            res.send("Unknown error has occured")
        }
    }
    res.send(data);
    repository.writetofile("cache");
})

async function indexallpokemon() {
    resetpokemons();
    console.log("Indexing all pokemon")
    await repository.getpokemon(allPokemon);
    app.listen(80);
    console.log(`Finished indexing ${pokemons.length} pokemon`);
}

async function enumarablyindexallpokemon() {
    resetpokemons();
    while (i < 9) {
        i++;
        await repository.getpokemon(toRequest);
        console.log(`Indexation progress: ${i}/9`);
    }
    app.listen(80);
    console.log(`Finished indexing ${pokemons.length} pokemon`);
}

fs.access("./cache.json", (err: any) => {
    if (err) {
        console.log("No cache found, creating")
        indexallpokemon();
        return;
    }
    console.log("Reading from cache")
})