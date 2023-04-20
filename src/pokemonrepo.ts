import { promises } from "fs";

import { fetchpokemon, fetchpokemoninfo, fetchalltypes, fetchdamagerelations } from "./fetchpokemon";
import { mapsingle, pokemons } from "./mappokemon";
import { Pokemon, AttackType, Types } from "./pokemonmodel";

export let offset = 0;
export let types: string[] = [];
export let attacktypes: AttackType[] = [
    {
        name: "tackle",
        damage: 20
    }
];

export async function setoffset(num: number) { offset = num }

async function filltypes() {
    const tmpTypes = await fetchalltypes();
    tmpTypes.forEach((type: { name: string; }) => types.push(type.name));
}
filltypes();

export default class PokemonRepository {
    public async getpokemon(amount: number): Promise<Pokemon[]> {
        let pokemonsdto = await fetchpokemon(amount)
        let pokemonsarray: Pokemon[] = [];
        if (!pokemonsdto)
            throw new Error("Couldn't retrieve pokemons");
        for (const pokemondto of pokemonsdto) {
            if (!pokemondto.name)
                throw new Error("Invalid name");
            const pokemon = await fetchpokemoninfo(pokemondto.name)
            if (!pokemon || !pokemon.types || !pokemon.types[0].type || !pokemon.types[0].type.name)
                throw new Error("Invalid info")
            let dmgrelat = await fetchdamagerelations(pokemon.types[0].type.name);
            if (!dmgrelat)
                throw new Error("Invalid damage relations");
            pokemonsarray.push(mapsingle(pokemon, dmgrelat));
        }
        console.log(pokemonsarray)
        return pokemonsarray;
    }

    public async writecache(pokes: Pokemon[]) {
        await promises.writeFile(`./cache.json`, JSON.stringify(pokes, null, 4));
        console.log("File written");
    }

    public async getpokemonbytype(type: string[]): Promise<Pokemon[]> {
        if (!type)
            return Promise.reject(new Error("Type is missing"));
        if ((types: any[]) => types.every((type: any) => types.includes(type))) {
            const data = pokemons.filter((pokemon) => type.every(type => pokemon.type?.includes(type)));
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