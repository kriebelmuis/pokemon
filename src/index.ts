import express, { Request, Response } from "express";

import { pokemons, resetpokemons, loadpokemons } from "./mappokemon";
import PokemonRepository from "./pokemonrepo";
import fs from "fs";
import mysql2 from "mysql2";
import { DamageRelations, DoubleDamageFrom, DoubleDamageTo, HalfDamageFrom, HalfDamageTo, NoDamageFrom, NoDamageTo, Pokemon } from "./pokemonmodel";
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
    clearteams();
    db.end();
}

async function attack(attacking: Pokemon, defending: Pokemon, damage: number): Promise<number | undefined> {
    if (!attacking.type || !defending.type || !attacking.hp || !defending.hp)
        return;
    if (attacking.hp <= 0) {
        console.log("Attacker dead")
    }
    if (defending.hp <= 0) {
        console.log("Defender already dead")
    }
    const mult = await checkmultiplication(attacking, defending)
    if (!defending.hp) {
        console.log("Invalid health");
        return;
    }
    if (!mult) {
        console.log("Invalid multiplier");
        return;
    }
    const calc = damage * mult;
    let newhp = defending.hp - calc;
    if (newhp < 0)
        newhp = 0;
    defending.hp = newhp;
    console.log(`${attacking.name} does ${calc} damage to ${attacking.name} making their health ${newhp}`)
    if (defending.hp == 0) {
        console.log(`${defending.name} has been killed`)
        db.query(`DELETE FROM team${defending.team} WHERE name=${defending.name}`, (err) => {
            if (err) {
                console.log(err.message);
                return;
            }
            console.log(`${defending.name} has been removed from their team table`);
        })
    }
}

async function checkmultiplication(attack: Pokemon | undefined, defend: Pokemon | undefined): Promise<number | undefined> {
    if (!attack || !defend)
        return;
    attack.dmgrelat?.forEach((relation: DamageRelations) => {
        relation.double_damage_to?.forEach((element: DoubleDamageTo) => {
            if (!defend?.name)
                return;
            if (element.name?.includes(defend.name)) {
                console.log(`Damage relation found: ${defend.name} gives 1.5 damage from ${attack.name}`)
                return 1.5;
            }
        });
        relation.half_damage_to?.forEach((element: HalfDamageTo) => {
            if (!defend?.name)
                return;
            if (element.name?.includes(defend.name)) {
                console.log(`Damage relation found: ${defend.name} gives 0.5 damage from ${attack.name}`)
                return .5;
            }
        });
        relation.no_damage_to?.forEach((element: NoDamageTo) => {
            if (!defend?.name)
                return;
            if (element.name?.includes(defend.name)) {
                console.log(`Damage relation found: ${defend.name} gives no damage to ${attack.name}`)
                return 0;
            }
        });
    });
}

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
            console.log(`Error code: ${err.code}`);
            setTimeout(connect, 3000);
            return;
        }
        console.log("Connected");
        await waitforready();
        await clearteams();
        const teamone = selectrandom(config.teamSize);
        const teamtwo = selectrandom(config.teamSize);

        await Promise.all(teamone.map(async element => await insertpokemon(element.id, element.name, element.hp, 1)));
        await Promise.all(teamtwo.map(async element => await insertpokemon(element.id, element.name, element.hp, 2)));

        console.log("All pokemons ready");

        db.query("SELECT * FROM team1;", (err, result) => {
            console.log(`Team 1:\n${JSON.stringify(result, null, 4)}`)
        })

        db.query("SELECT * FROM team2;", (err, result) => {
            console.log(`Team 2:\n${JSON.stringify(result, null, 4)}`)
        })
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
    if (id || name || team !== undefined) {
        console.log(`Inserting pokemon with id ${id} name ${name} and hp ${hp} in table team${team}`);
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

app.get("/attack", async (req: Request<Attack>, res: Response) => {
    await waitforready();
    const dmg = attacktypes.filter(att => att.name?.includes(req.query.attacktype as string))[0];
    const attacker = pokemons.filter(att => att.name?.includes(req.query.attacker as string))[0];
    const defender = pokemons.filter(def => def.name?.includes(req.query.defender as string))[0];

    if (!dmg) {
        console.log("Couldn't find attack")
    }
    if (!attacker) {
        console.log(`Couldn't find attack pokemon with name ${attacker}`)
    }
    if (!defender) {
        console.log(`Couldn't find defender pokemon with name ${defender}`)
    }

    db.query(`SELECT ${attacker} FROM team1`, async (err) => {
        if (err) {
            db.query(`SELECT ${attacker} FROM team2`, async (error) => {
                if (error) {
                    res.send(`Error: ${error.message}`)
                    return;
                }
                attacker.team = 2;
                if (dmg.damage)
                    res.send(await attack(attacker, defender, dmg.damage));
            })
        }
        attacker.team = 1;
        if (dmg.damage)
            res.send(await attack(attacker, defender, dmg.damage));
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