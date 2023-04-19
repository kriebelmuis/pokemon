import express, { Request, Response } from "express";

import { pokemons, resetpokemons, loadpokemons } from "./mappokemon";
import PokemonRepository from "./pokemonrepo";
import fs from "fs";
import mysql2 from "mysql2";
import { DoubleDamageTo, HalfDamageTo, NoDamageTo, Pokemon } from "./pokemonmodel";
import { attacktypes } from "./pokemonrepo";

const repository = new PokemonRepository();
const app = express();

const config = require("../config.json")

let newpokemons: Pokemon[];

let ready = false;

const db = mysql2.createConnection({
    host: "database",
    user: "root",
    port: 3306,
    password: "password",
    database: "pokemon"
});

process.on('exit', onexit);
process.on('SIGINT', onexit);

function onexit() {
    wipeteams();
    db.end();
}

async function attack(attacking: Pokemon, defending: Pokemon, damage: number): Promise<string> {
    if (!attacking.type || !defending.type || !attacking.hp || !defending.hp)
        return "Attacker or defender type or hp is undefined";
    if (attacking.hp <= 0) {
        return "Attacker is dead";
    }
    if (defending.hp <= 0) {
        return "Defender is dead";
    }
    const mult = await checkmultiplication(attacking, defending)
    if (!defending.hp)
        return "Invalid health";
    if (!mult)
        return "Invalid multiplier";
    const calc = damage * mult;
    let newhp = defending.hp - calc;
    if (newhp < 0)
        newhp = 0;
    defending.hp = newhp;
    if (defending.hp == 0) {
        console.log(`${defending.name} has been killed`)
        db.query(`DELETE FROM team${defending.team} WHERE name=${defending.name};`, (err) => {
            if (err) {
                console.log(err.message);
            }
            console.log(`Pokemon ${defending.name} removed`)
        })
    }
    return `${attacking.name} does ${calc} damage to ${attacking.name} making their health ${newhp} with a ${mult}x multiplier`;
}

async function checkmultiplication(attack: Pokemon | undefined, defend: Pokemon | undefined): Promise<number | undefined> {
    if (!attack || !defend)
        return;
    attack.dmgrelat?.double_damage_to?.forEach((element: DoubleDamageTo) => {
        if (!defend?.name)
            return;
        if (element.name?.includes(defend?.name)) {
            console.log(`Damage relation found: ${defend?.name} gives 1.5 damage from ${attack?.name}`);
            return 1.5;
        }
    });
    attack.dmgrelat?.half_damage_to?.forEach((element: HalfDamageTo) => {
        if (!defend?.name)
            return;
        if (element.name?.includes(defend?.name)) {
            console.log(`Damage relation found: ${defend?.name} gives 0.5 damage from ${attack?.name}`);
            return .5;
        }
    });
    attack.dmgrelat?.no_damage_to?.forEach((element: NoDamageTo) => {
        if (!defend?.name)
            return;
        if (element.name?.includes(defend?.name)) {
            console.log(`Damage relation found: ${defend?.name} gives no damage to ${attack?.name}`);
            return 0;
        }
    });
    return 1;
}

async function waitforready() {
    while (!ready) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log("Waiting for pokemons")
    }
    newpokemons = pokemons.slice();
}

const connect = () => {
    console.log("Attempting to connect");
    db.connect(async (err) => {
        if (err) {
            console.log(`Error code: ${err.code}`);
            setTimeout(connect, 3000);
            return;
        }
        await waitforready();
        await wipeteams();
        const teamone = selectrandom(config.teamSize);
        const teamtwo = selectrandom(config.teamSize);

        teamone.forEach(async (pokemon) => {
            if (pokemon?.id && pokemon?.name && pokemon?.hp) {
                pokemon.team = 1;
                await insertpokemon(pokemon?.id, pokemon?.name, pokemon?.hp, 1)
            }
            else {
                console.log(`${pokemon?.id} ${pokemon?.name} ${pokemon?.hp} ${pokemon?.team}`)
            }
        })
        teamtwo.forEach(async (pokemon) => {
            if (pokemon?.id && pokemon?.name && pokemon?.hp) {
                pokemon.team = 2;
                await insertpokemon(pokemon?.id, pokemon?.name, pokemon?.hp, 2)
            }
            else {
                console.log(`${pokemon?.id} ${pokemon?.name} ${pokemon?.hp} ${pokemon?.team}`)
            }
        })
    });
};
connect();

function selectrandom(teamsize: number) {
    console.log(`Selecting random ${teamsize} pokemon`)
    const array = [];
    const length = newpokemons.length
    console.log(JSON.stringify(newpokemons, null, 4))
    for (let i = 0; i < teamsize; i++) {
        const index = Math.floor(Math.random() * length);
        console.log(`Randomized index ${index} with max ${length}`);
        array.push(newpokemons[index]);
        newpokemons.splice(index, 1);
    }
    return array;
}

async function wipeteams() {
    console.log("Clearing teams")
    db.query(`DELETE FROM team1;`, (err) => {
        if (err) {
            console.log(err.message);
            return;
        }
        console.log("Successfully wiped team 1");
    });
    db.query(`DELETE FROM team2;`, (err) => {
        if (err) {
            console.log(err.message);
            return;
        }
        console.log("Successfully wiped team 2");
    });
}

async function insertpokemon(id: number | undefined, name: string | undefined, hp: number | undefined, team: number | undefined) {
    console.log(`Inserting pokemon with id ${id} name ${name} and hp ${hp} in table team${team}`);
    if (id != undefined || !name != undefined || !team != undefined) {
        db.query(`INSERT INTO team${team} (id, name, hp) VALUES (${id}, "${name}", ${hp});`, (err) => {
            if (err) {
                console.log(err.message);
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

interface Attack {
    attacktype: string;
    attacker: string;
    defender: string;
}

app.post("/attack", async (req: Request<Attack>, res: Response) => {
    await waitforready();
    const dmg = attacktypes.filter(att => att.name?.includes(req.query.attacktype as string))[0];
    const attacker = pokemons.filter(att => att.name?.includes(req.query.attacker as string))[0];
    const defender = pokemons.filter(def => def.name?.includes(req.query.defender as string))[0];

    if (!dmg) {
        res.status(404).send("Couldn't find attack")
    }
    if (!attacker) {
        res.status(404).send(`Couldn't find attack pokemon with name ${attacker}`)
    }
    if (!defender) {
        res.status(404).send(`Couldn't find defender pokemon with name ${defender}`)
    }

    db.query(`SELECT * FROM team1 WHERE name = '${attacker.name}'; `, async (err) => {
        if (err) {
            res.status(409).send(`Error: ${err.message}`)
            return;
        }
        if (dmg.damage)
            res.status(200).send(await attack(attacker, defender, dmg.damage));
    })
})

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
    var data = await repository.getpokemon(config.allPokemon);
    loadpokemons(data);
    app.listen(config.port);
    await repository.writecache(data);
    ready = true;
    console.log(`Finished indexing ${pokemons.length} pokemon`);
}

async function enumarablyindexallpokemon() {
    resetpokemons();
    let pokes: Pokemon[] = [];
    for (let i = 0; i < config.requestMultiplier; i++) {
        pokes.concat(await repository.getpokemon(config.toRequest));
        console.log(`Indexation progress: ${i}/${config.requestMultiplier}`);
    }
    loadpokemons(pokes);
    app.listen(config.port);
    await repository.writecache(pokes);
    ready = true;
    console.log(`Finished indexing ${pokemons.length} pokemon`);
}

fs.access("./cache.json", async (err: any) => {
    if (err || config.forceCache) {
        console.log("No cache found, creating");
        config.enumarably ? await enumarablyindexallpokemon() : await indexallpokemon();
        return;
    }
    loadpokemons(require("../cache.json"));
    app.listen(config.port);
    ready = true;
    console.log("Reading from cache");
})