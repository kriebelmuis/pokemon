import { Pokemon, PokemonDTO, PokemonType, Types } from "./pokemonmodel";

export let pokemons: Pokemon[] = [];

export async function resetpokemons() { pokemons = [] }

export async function loadpokemons(pm: any) { pokemons = pm }

const config = require("../config.json")

export async function map(poke: PokemonDTO[]): Promise<Pokemon[]> {
    poke.forEach((pokemon: any) => {
        let types: PokemonType[] = pokemon.types.map((element: { type: { name: Types } }) => element.type.name);
        pokemons.push({
            name: pokemon.name,
            id: pokemon.id,
            height: pokemon.height,
            type: types,
            hp: Math.random() * (config.maxrandHealth - config.minrandHealth) + config.minrandHealth,
        });
    })
    return pokemons;
}
