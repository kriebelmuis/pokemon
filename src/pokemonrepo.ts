import { promises } from "fs";

import { fetchpokemon, fetchpokemoninfo, fetchalltypes } from "./fetchpokemon";
import { map, pokemons } from "./mappokemon";
import { PokemonDTO, Pokemon, PokemonType } from "./pokemonmodel";

export let offset = 0;
export let types: string[] = [];

export async function setoffset(num: number) { offset = num }

async function filltypes() {
    const tmpTypes = await fetchalltypes();
    tmpTypes.forEach((type: { name: string; }) => types.push(type.name));
}
filltypes();

export default class PokemonRepository {
    public async getpokemon(amount: number) {
        let pokemondtos: PokemonDTO[] = [];
        let pokemondto = await fetchpokemon(amount)
        if (!pokemondto)
            throw new Error("Couldn't retrieve pokemons");
        for (const element of pokemondto) {
            if (!element.name) {
                console.log("Invalid name");
                return;
            }
            let pokedto = await fetchpokemoninfo(element.name)
            if (!pokedto) {
                console.log("Invalid pokeinfo");
                return;
            }
            pokemondtos.push(pokedto as PokemonDTO);
        }
        console.log("Mapping data");
        return await map(pokemondtos);
    }

    public async writecache() {
        await promises.writeFile(`./cache.json`, JSON.stringify(pokemons, null, 4));
        console.log("File written");
    }

    public async getpokemonbytype(type: string[]): Promise<Pokemon[]> {
        if (!type)
            return Promise.reject(new Error("Type is missing"));
        if ((types: any[]) => types.every((type: any) => types.includes(type))) {
            const data = pokemons.filter((pokemon) => type.every(type => pokemon.type?.includes(type as PokemonType)));
            if (!data)
                return Promise.reject(new Error("Invalid type"));
            if (data.length === 0)
                return Promise.reject(new Error("No results found"));
            return data;
        } else {
            return Promise.reject(new Error(`Type ${type} does not exist`));
        }
    }
}