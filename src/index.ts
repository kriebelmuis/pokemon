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
        newpokemons = pokemons;
    }
    console.log("Pokemons retrieved")
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
        await cleartable();
        const teamone = selectrandom(config.teamSize);
        const teamtwo = selectrandom(config.teamSize);
        teamone.forEach(element => {
            console.log(element)
            insertpokemon(element.id, element.name, 1)
        });
        teamtwo.forEach(element => {
            insertpokemon(element.id, element.name, 1)
        });
    });
};
connect();

function disconnect() {
    db.end(function(err) {
        if (err) {
            console.log(err.message);
        }
        console.log('Database disconnected');
    });
}

function selectrandom(teamsize: number) {
    console.log(`Selecting random ${teamsize} pokemon`)
    const array = [];
    for (let i = 0; i < teamsize; i++) {
        const index = Math.floor(Math.random() * newpokemons.length);
        array.push(newpokemons[index])
        console.log(newpokemons[index])
        newpokemons.splice(index, 1)
    }
    return array;
}

async function cleartable() {
    console.log("Clearing table")
    db.query(`DELETE FROM ${config.tableName};`, (err, result, fields) => {
        if (err) {
            console.log(err);
            return;
        }
        console.log(result);
    });
}

function insertpokemon(id: number | undefined, name: string | undefined, team: number | undefined) {
    if (id || name || team !== undefined) {
        db.query(`INSERT INTO ${config.tableName} (${id}, ${name}, ${team});`, (err, result, fields) => {
            if (err || typeof id !== "number") {
                console.log(err)
                return;
            }
            console.log(result);
            id++;
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
        if (config.enumarably) {
            enumarablyindexallpokemon();
        }
        if (!config.enumarably) {
            indexallpokemon();
        }
        return;
    }
    loadpokemons(require("../cache.json"));
    app.listen(80);
    ready = true;
    console.log("Reading from cache");
})

console.log("Docker ready")