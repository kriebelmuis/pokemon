import { error } from "console";
import { fetchpokemon, fetchpokemoninfo, fetchalltypes } from "./fetchpokemon";
import { map, pokemons } from "./mappokemon";
import { PokemonDTO, Pokemon } from "./pokemonmodel";

export let offset = 0;
export let types : string[] = [];

export async function setoffset(num : number) { offset = num }

async function filltypes() {
    var tmpTypes = await fetchalltypes();
    tmpTypes.forEach((type: { name: string; }) => types.push(type.name));
}
filltypes();

export default class PokemonRepository {
    public async getpokemon(amount : number) {
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

    public async getpokemonbytype(type : any ): Promise<Pokemon[] | null> {
        type = type as string;
        if (!type)
            console.log("m")
            //throw new Error("Type is missing");
        var lowercasetype = type.toLowerCase();
        if (types.filter((t) => t === lowercasetype).length !== 0) {
            var data = pokemons.filter((p) => p.type === lowercasetype);
            if (!data)
                throw new Error("Invalid type")
            if (data.length === 0)
                throw new Error("No results found");
            return data;
        } else {
            throw new Error(`Type ${lowercasetype} does not exist`);
        }
    }
}