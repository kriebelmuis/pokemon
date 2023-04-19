import { DamageRelations, Pokemon, PokemonDTO } from "./pokemonmodel";

export let pokemons: Pokemon[] = [];

export async function resetpokemons() { pokemons = [] }

export async function loadpokemons(pm: any) { pokemons = pm }

const config = require("../config.json")

export function map(poke: PokemonDTO[], dmgrelat: DamageRelations): Pokemon[] {
    poke.forEach((pokemon: any) => mapsingle);
    return pokemons;
}
export function mapsingle(pokemondto: PokemonDTO, dmgrelat: DamageRelations): Pokemon {
    let types: string[] = [];
    pokemondto.types?.forEach((pokemontype) => {
        if (pokemontype.type?.name) {
            types.push(pokemontype.type.name);
        }
    })
    return {
        id: pokemondto.id,
        name: pokemondto.name,
        type: types,
        hp: Math.floor(Math.random() * (config.maxrandHealth - config.minrandHealth) + config.minrandHealth),
        dmgrelat: dmgrelat
    };
}