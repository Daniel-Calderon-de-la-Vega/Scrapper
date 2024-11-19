import { chromium } from "playwright";
import fs from 'fs';
import { promisify } from "util";
import readline from 'readline';


const readFile = promisify(fs.readFile);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function main() {
    try {
        const data = await readFile('juegos.json', 'utf8');
        const juegos = JSON.parse(data).juegos;

        rl.question('Introduce el nombre del juego: ', async (nombreJuego) => {
            const juegoEncontrado = juegos.find(juego => juego.nombre.toLowerCase() === nombreJuego.toLowerCase());

            if (juegoEncontrado) {
                console.log(`Juego encontrado: ${juegoEncontrado.nombre}`);
                const enlaces = juegoEncontrado.enlaces;

                await Scrapper(enlaces);

            } else {
                console.log('No se encontró el juego.');
            }

            rl.close();
        });
    } catch (error) {
        console.error('Error al leer el archivo:', error);
    }

}


async function Scrapper(enlaces) {
    const enlaceInstant = enlaces.InstantGaming;
    const enlaceEneba = enlaces.Eneba;
    const enlaceSteam = enlaces.Steam;
    let Instant = null;
    let Eneba = null;
    let Steam = null;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();


    if (enlaceInstant) {
        await page.goto(enlaceInstant);

        Instant = await page.$$eval('body', (resultsInstant) => {
            const precios = resultsInstant.map((el) => {
                const precioTexto = el.querySelector('.total')?.innerText;
                const precio = precioTexto ? parseFloat(precioTexto.replace("€", '').replace(',', '.').trim()) : null;
                return { precio };
            }).filter(item => item.precio !== null);

            return precios.length > 0 ? { precio: precios[0].precio } : null;
        });
    }

    if (enlaceEneba) {
        await page.goto(enlaceEneba);
        await page.waitForTimeout(2000);

        const estaAgotado = await page.$('.hRJRi1') !== null;



        if (estaAgotado) {
            Eneba = null;
        } else {
            await page.waitForSelector('.ej1a7C');

            Eneba = await page.$$eval('._7z2Gr', (resultsEneba) => {
                const precios = resultsEneba.map((el) => {
                    const precioElemento = el.querySelector('.L5ErLT');
                    if (precioElemento) {
                        const Precio = parseFloat(precioElemento.innerText.replace("€", '').replace(',', '.'));
                        return isNaN(Precio) ? null : Precio;
                    }
                    return null;
                }).filter(item => item !== null);
                return precios.length > 0 ? Math.min(...precios) : null;
            });
        }
    } else {

    }

    if (enlaceSteam) {
        await page.goto(enlaceSteam);


        const preciosDLC = await page.$$eval('.game_area_dlc_price', (elementsDLC) => {
            return elementsDLC.map((el) => {
                const precio = parseFloat(el.innerText.replace("€", '').replace(',', '.').trim());
                return isNaN(precio) ? null : precio;
            }).filter(item => item !== null);
        });


        const preciosJuego = await page.$$eval('.game_purchase_price.price, .discount_final_price', (elementsJuego) => {
            return elementsJuego.map((el) => {
                const precio = parseFloat(el.innerText.replace("€", '').replace(',', '.').trim());
                return isNaN(precio) ? null : precio;
            }).filter(item => item !== null);
        });

        const preciosFiltradosJuego = preciosJuego.filter(precio => !preciosDLC.includes(precio));

        Steam = preciosFiltradosJuego.length > 0 ? Math.min(...preciosFiltradosJuego) : null;

        if (Steam !== null) {
        } else {
        }
    } else {
    }


    const resultados = {
        instantGaming: Instant ? { Precio: Instant.precio } : 'No se encontraron resultados',
        eNeBa: Eneba ? { Precio: Eneba } : 'No se encontraron resultados',
        steam: Steam !== null ? { Precio: Steam } : 'No se encontraron resultados'
    };


    const jsonResultados = JSON.stringify(resultados, null, 2);
    fs.writeFileSync('resultados.json', jsonResultados);

    await browser.close();
}


main();




