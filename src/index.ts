import express, { Request, Response } from "express";

import { Pokemon, Types } from "./pokemonmodel";
import { pokemons } from "./mappokemon";
import PokemonRepository from "./pokemonrepo";

const repository = new PokemonRepository();
const app = express();

let i = 0;
var allPokemon = 811;
var toRequest = 85;

interface PokemonRequest {
    type: string;
}

app.get("/", async (req : Request<PokemonRequest>, res : Response) => {
    if (!req.query.type)
        res.send("No type sent")
    var data = await repository.getpokemonbytype((req.query.type as string).toLowerCase());
    if (!data) {
        res.send("Invalid type")
        return;
    }
    if (data.length === 0) {
        res.send("No results found");
        return;
    }
    res.send(data);
})

async function indexallpokemon() {
    console.log("Indexing all pokemon")
    await repository.getpokemon(allPokemon);
    app.listen(80);
    console.log(`Finished indexing ${pokemons.length} pokemon`);
}
indexallpokemon();

async function enumarablyindexallpokemon() {
    while (i < 9) {
        i++;
        await repository.getpokemon(toRequest);
        console.log(`Indexation progress: ${i}/9`);
    }
    app.listen(80);
    console.log(`Finished indexing ${pokemons.length} pokemon`);
}