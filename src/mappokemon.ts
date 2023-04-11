import { promises } from "fs";

import { Pokemon, PokemonDTO } from "./pokemonmodel";

export let pokemons : Pokemon[] = [];

export async function map(poke : PokemonDTO[]): Promise<Pokemon[]> {
    poke.forEach((pokemon: any) => {
        pokemons.push({
            name: pokemon.name,
            id: pokemon.id,
            height: pokemon.height,
            type: pokemon.types[0].type.name
        });
    })
    return pokemons;
}

export async function writetofile(filename : string) {
    await promises.writeFile(`./${filename}.json`, JSON.stringify(pokemons));
    console.log("File written");
}