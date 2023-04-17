import { DamageRelations, Pokemon, PokemonDTO, PokemonType, Types } from "./pokemonmodel";

export let pokemons: Pokemon[] = [];

export async function resetpokemons() { pokemons = [] }

export async function loadpokemons(pm: any) { pokemons = pm }

const config = require("../config.json")

export async function map(poke: PokemonDTO[], dmgrelat: DamageRelations): Promise<Pokemon[]> {
    poke.forEach((pokemon: any) => mapsingle);
    return pokemons;
}

export async function mapsingle(pokemon: any, dmgrelat: any) {
    let types: PokemonType[] = pokemon.types?.map((element: { type: { name: Types } }) => element.type.name);
    pokemons.push({
        name: pokemon.info?.name,
        id: pokemon.info?.id,
        type: types,
        hp: Math.random() * (config.maxrandHealth - config.minrandHealth) + config.minrandHealth,
        dmgrelat: dmgrelat
    });
}