import express, { Request, Response } from "express";

import { pokemons, resetpokemons, loadpokemons } from "./mappokemon";
import PokemonRepository from "./pokemonrepo";
import fs from "fs";
import mysql2 from "mysql2";
import { Pokemon } from "./pokemonmodel";

const repository = new PokemonRepository();
const app = express();

const config = require("../config.json")

let newpokemons: Pokemon[];

let ready = false;

const db = mysql2.createConnection({
    host: "omar_db",
    user: "root",
    port: 3306,
    password: "password",
    database: "pokemon"
});

async function waitforready() {
    while (!ready) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log("Waiting for pokemons")
    }
    console.log("Pokemons retrieved")
    newpokemons = pokemons.slice();
}

const connect = () => {
    console.log("Attempting to connect");
    db.connect(async (err) => {
        if (err) {
            console.log(err);
            setTimeout(connect, 3000);
            return;
        }
        console.log("Connected");
        await waitforready();
        await clearteams();
        const teamone = selectrandom(config.teamSize);
        const teamtwo = selectrandom(config.teamSize);
        
        await Promise.all(teamone.map(element => insertpokemon(element.id, element.name, 1)));
        await Promise.all(teamtwo.map(element => insertpokemon(element.id, element.name, 2)));
        
        console.log("All pokemons ready");
    });
};
connect();


function selectrandom(teamsize: number) {
    console.log(`Selecting random ${teamsize} pokemon`)
    const array = [];
    for (let i = 0; i < teamsize; i++) {
        const index = Math.floor(Math.random() * newpokemons.length);
        console.log(`Randomized index ${index}`)
        array.push(newpokemons[index])
        newpokemons.splice(index, 1)
    }
    return array;
}

async function clearteams() {
    console.log("Clearing teams")
    db.query(`DELETE FROM team1;`, (err, result) => {
        if (err) {
            console.log(err);
            return;
        }
        console.log("Successfully wiped team 1");
    });
    db.query(`DELETE FROM team2;`, (err, result) => {
        if (err) {
            console.log(err);
            return;
        }
        console.log("Successfully wiped team 2, all teams");
    });
}

async function insertpokemon(id: number | undefined, name: string | undefined, team: number | undefined) {
    if (id || name || team !== undefined) {
        console.log(`Inserting pokemon with id ${id} name ${name} in table team${team}`);
        db.query(`INSERT INTO team${team} (id, name) VALUES (${id}, "${name}");`, (err, result) => {
            if (err || typeof id !== "number") {
                console.log(err);
                return;
            }
            console.log(`Successfully added pokemon ${name} in team ${team}`);
        })
    } else {
        console.log(`One of the properties of ${name} are undefined`)
    }
}

interface PokemonRequest {
    type: string;
}

app.get("/", async (req: Request<PokemonRequest>, res: Response) => {
    let data;
    try {
        data = await repository.getpokemonbytype((req.query.type as string).split(","));
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
    await repository.writecache();
    ready = true;
    console.log(`Finished indexing ${pokemons.length} pokemon`);
}

async function enumarablyindexallpokemon() {
    resetpokemons();
    for (let i = 0; i < config.requestMultiplier; i++) {
        await repository.getpokemon(config.toRequest);
        console.log(`Indexation progress: ${i}/${config.requestMultiplier}`);
    }
    app.listen(80);
    await repository.writecache();
    ready = true;
    console.log(`Finished indexing ${pokemons.length} pokemon`);
}

fs.access("./cache.json", (err: any) => {
    if (err || config.forceCache) {
        console.log("No cache found, creating");
        config.enumarably ? enumarablyindexallpokemon() : indexallpokemon();
        return;
    }
    loadpokemons(require("../cache.json"));
    app.listen(80);
    ready = true;
    console.log("Reading from cache");
})

console.log("Docker ready")