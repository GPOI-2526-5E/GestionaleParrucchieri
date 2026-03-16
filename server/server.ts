import express from "express";
import fileUpload, { UploadedFile } from "express-fileupload";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";
import cloudinary, { UploadStream } from "cloudinary";
import OpenAI from "openai";
import mysql from "mysql2";

//Configurazione server express
const app = express();
const PORT = 3000;
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "db_parrucchieri"
});

//Carico le variabili di ambiente dal file .env
dotenv.config({ path: ".env" });

const hf = new OpenAI({
    baseURL: "https://router.huggingface.co/v1",
    apiKey: process.env.HF_TOKEN,
});

//Configuro Cloudinary
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
    api_key: process.env.CLOUDINARY_API_KEY as string,
    api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

app.use("/", (req, res, next) => {
    console.log("----> " + req.method + ":" + req.originalUrl);
    next();
});

app.use("/", express.static("./static"));

app.use(cors({
    origin: "http://localhost:4200",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

//Permette di leggere JSON nel body
app.use(express.json());

app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: "./tmp/"
}));

const uploadDir = "./uploads";

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

//imgParrucchieri
app.get("/api/imgParrucchieri", async (req, res) => {
    try {
        const result = await cloudinary.v2.search
            .expression("folder:ImgParrucchieri")
            .sort_by("created_at", "desc")
            .max_results(100)
            .execute();

        const images = result.resources.map((img: any) => img.secure_url);
        res.json(images);
    } catch (err) {
        res.status(500).send("Errore nel recupero delle immagini da Cloudinary");
    }
});

//imgProdotti
app.get("/api/imgProdotti", async (req, res) => {
    try {
        const result = await cloudinary.v2.search
            .expression("folder:ImgParrucchieri/prodotti")
            .sort_by("created_at", "desc")
            .max_results(100)
            .execute();

        const images = result.resources.map((img: any) => img.secure_url);
        res.json(images);
    } catch (err) {
        res.status(500).send("Errore nel recupero delle immagini da Cloudinary");
    }
});

//Richiesta IA

type ServiceCard = {
    idServizio: number;
    nome: string;
    descrizione: string;
    durata: number;
    prezzo: number;
};

function normalizeText(text: unknown): string {
    return String(text ?? "").toLowerCase().trim();
}

function safeString(value: unknown): string {
    return String(value ?? "").trim();
}

function detectIntent(text: string): "servizi" | "taglio" | "colore" | "trattamento" | "generic" {
    const t = normalizeText(text);

    if (
        t.includes("servizi") ||
        t.includes("servizio") ||
        t.includes("cosa fate") ||
        t.includes("cosa offrite") ||
        t.includes("offrite") ||
        t.includes("quali servizi")
    ) {
        return "servizi";
    }

    if (t.includes("taglio") || t.includes("sfumatura") || t.includes("barba")) {
        return "taglio";
    }

    if (
        t.includes("colore") ||
        t.includes("tinta") ||
        t.includes("balayage") ||
        t.includes("schiar") ||
        t.includes("colpi di sole")
    ) {
        return "colore";
    }

    if (
        t.includes("trattamento") ||
        t.includes("cheratina") ||
        t.includes("ricostruzione") ||
        t.includes("anti crespo") ||
        t.includes("anticrespo")
    ) {
        return "trattamento";
    }

    return "generic";
}

function detectRequestType(text: string): "list" | "specific-service" | "advice" | "generic" {
    const t = normalizeText(text);

    const explicitListSignals = [
        "che servizi offrite",
        "quali servizi",
        "cosa fate",
        "cosa offrite",
        "lista servizi",
        "catalogo servizi",
        "mostrami i servizi",
        "fammi vedere i servizi"
    ];

    const adviceSignals = [
        "consigli",
        "consigliami",
        "mi consigli",
        "quale",
        "adatto",
        "adatta",
        "meglio",
        "vorrei un consiglio",
        "che trattamento",
        "che colore",
        "che taglio",
        "per capelli rovinati",
        "per i miei capelli",
        "secondo te",
        "più adatto",
        "più adatta"
    ];

    const specificSignals = [
        "fate",
        "avete",
        "è disponibile",
        "disponibile",
        "vorrei questo",
        "mi interessa",
        "avete anche",
        "fate anche",
        "questo tipo di servizio",
        "questo servizio",
        "questo tipo di taglio",
        "una cosa del genere"
    ];

    if (explicitListSignals.some(k => t.includes(k))) return "list";
    if (adviceSignals.some(k => t.includes(k))) return "advice";
    if (specificSignals.some(k => t.includes(k))) return "specific-service";

    return "generic";
}

function isPriceQuestion(text: string): boolean {
    const t = normalizeText(text);

    return (
        t.includes("quanto costa") ||
        t.includes("quanto costerebbe") ||
        t.includes("quanto viene") ||
        t.includes("prezzo") ||
        t.includes("costo") ||
        t.includes("costi") ||
        t.includes("quanto pago") ||
        t.includes("che prezzo ha")
    );
}

function needsMoreInfoForAdvice(text: string): boolean {
    const t = normalizeText(text);

    const askingAdvice =
        t.includes("consigli") ||
        t.includes("consigliami") ||
        t.includes("mi consigli") ||
        t.includes("adatto") ||
        t.includes("adatta") ||
        t.includes("secondo te") ||
        t.includes("più adatto") ||
        t.includes("che taglio");

    if (!askingAdvice) return false;

    const hasUsefulDetails =
        t.includes("uomo") ||
        t.includes("donna") ||
        t.includes("ricci") ||
        t.includes("mossi") ||
        t.includes("lisci") ||
        t.includes("corti") ||
        t.includes("corto") ||
        t.includes("medi") ||
        t.includes("medio") ||
        t.includes("lunghi") ||
        t.includes("lungo") ||
        t.includes("sportivo") ||
        t.includes("volum") ||
        t.includes("frangia") ||
        t.includes("rovinati") ||
        t.includes("crespi") ||
        t.includes("cute") ||
        t.includes("barba");

    return !hasUsefulDetails;
}

function buildAdviceClarificationReply(lastUser: string): string {
    const text = normalizeText(lastUser);

    if (text.includes("taglio")) {
        return "Posso consigliarti bene, ma prima ho bisogno di qualche dettaglio: i tuoi capelli sono corti, medi o lunghi? Lisci, mossi o ricci? E preferisci un risultato facile da gestire oppure più strutturato?";
    }

    if (text.includes("colore") || text.includes("tinta") || text.includes("balayage")) {
        return "Posso consigliarti bene, ma prima devo capire meglio il risultato che vuoi ottenere: preferisci un effetto naturale o più evidente? Hai già un colore di base o capelli trattati?";
    }

    if (text.includes("trattamento")) {
        return "Posso indicarti il trattamento più adatto, ma prima devo capire meglio il capello: è secco, crespo, rovinato, trattato o tende a spezzarsi?";
    }

    return "Posso consigliarti bene, ma prima ho bisogno di qualche dettaglio in più sul tuo tipo di capello e sul risultato che vuoi ottenere.";
}

function queryDb<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) reject(err);
            else resolve(result as T[]);
        });
    });
}

function serviceKeywords(): string[] {
    return [
        "taglio",
        "uomo",
        "donna",
        "barba",
        "sfumatura",
        "piega",
        "colore",
        "tinta",
        "balayage",
        "schiaritura",
        "schiariture",
        "colpi di sole",
        "shampoo",
        "trattamento",
        "cheratina",
        "ricostruzione",
        "ristrutturante",
        "anticrespo",
        "anti crespo"
    ];
}

function scoreServiceMatch(userText: string, service: ServiceCard): number {
    const text = normalizeText(userText);
    const nome = normalizeText(service.nome);
    const descrizione = normalizeText(service.descrizione);

    let score = 0;

    if (!text) return 0;

    if (text.includes(nome)) score += 100;

    const keywords = serviceKeywords();

    for (const key of keywords) {
        if (text.includes(key) && nome.includes(key)) score += 25;
        if (text.includes(key) && descrizione.includes(key)) score += 12;
    }

    if (
        text.includes("taglio") &&
        text.includes("barba") &&
        nome.includes("taglio") &&
        nome.includes("barba")
    ) {
        score += 80;
    }

    if (
        text.includes("capelli rovinati") &&
        (
            nome.includes("trattamento") ||
            nome.includes("ricostruzione") ||
            nome.includes("ristrutturante") ||
            descrizione.includes("nutriente") ||
            descrizione.includes("rigenerante") ||
            descrizione.includes("ristruttur")
        )
    ) {
        score += 60;
    }

    if (
        (text.includes("naturale") || text.includes("schiar")) &&
        (nome.includes("balayage") || descrizione.includes("naturale") || descrizione.includes("schiar"))
    ) {
        score += 40;
    }

    if (
        text.includes("piega") &&
        (nome.includes("piega") || descrizione.includes("piega"))
    ) {
        score += 50;
    }

    if (
        text.includes("colore") &&
        (nome.includes("colore") || descrizione.includes("colorazione"))
    ) {
        score += 50;
    }

    return score;
}

async function getSuggestedServices(lastUser: string): Promise<ServiceCard[]> {
    const text = normalizeText(lastUser);

    try {
        if (
            text.includes("servizi") ||
            text.includes("servizio") ||
            text.includes("cosa fate") ||
            text.includes("cosa offrite") ||
            text.includes("offrite") ||
            text.includes("quali servizi")
        ) {
            return await queryDb<ServiceCard>(`
                SELECT idServizio, nome, descrizione, durata, prezzo
                FROM servizi
                LIMIT 6
            `);
        }

        if (text.includes("taglio") || text.includes("sfumatura")) {
            return await queryDb<ServiceCard>(`
                SELECT idServizio, nome, descrizione, durata, prezzo
                FROM servizi
                WHERE LOWER(nome) LIKE '%taglio%'
                   OR LOWER(nome) LIKE '%sfumatura%'
                   OR LOWER(descrizione) LIKE '%taglio%'
                   OR LOWER(descrizione) LIKE '%sfumatura%'
                LIMIT 4
            `);
        }

        if (text.includes("barba")) {
            return await queryDb<ServiceCard>(`
                SELECT idServizio, nome, descrizione, durata, prezzo
                FROM servizi
                WHERE LOWER(nome) LIKE '%barba%'
                   OR LOWER(descrizione) LIKE '%barba%'
                LIMIT 4
            `);
        }

        if (
            text.includes("colore") ||
            text.includes("tinta") ||
            text.includes("balayage") ||
            text.includes("schiar") ||
            text.includes("colpi di sole")
        ) {
            return await queryDb<ServiceCard>(`
                SELECT idServizio, nome, descrizione, durata, prezzo
                FROM servizi
                WHERE LOWER(nome) LIKE '%colore%'
                   OR LOWER(nome) LIKE '%tinta%'
                   OR LOWER(nome) LIKE '%balayage%'
                   OR LOWER(descrizione) LIKE '%schiar%'
                   OR LOWER(descrizione) LIKE '%colpi di sole%'
                LIMIT 4
            `);
        }

        if (
            text.includes("trattamento") ||
            text.includes("cheratina") ||
            text.includes("ricostruzione") ||
            text.includes("anti crespo") ||
            text.includes("anticrespo")
        ) {
            return await queryDb<ServiceCard>(`
                SELECT idServizio, nome, descrizione, durata, prezzo
                FROM servizi
                WHERE LOWER(nome) LIKE '%tratt%'
                   OR LOWER(nome) LIKE '%cheratina%'
                   OR LOWER(nome) LIKE '%ricostruzione%'
                   OR LOWER(descrizione) LIKE '%tratt%'
                   OR LOWER(descrizione) LIKE '%cheratina%'
                   OR LOWER(descrizione) LIKE '%ricostruzione%'
                LIMIT 4
            `);
        }

        return [];
    } catch (err) {
        console.error("Errore ricerca servizi:", err);
        return [];
    }
}

async function getBestMatchingServices(
    lastUser: string,
    mode: "list" | "specific-service" | "advice" | "generic"
): Promise<ServiceCard[]> {
    try {
        if (mode === "list") {
            return await queryDb<ServiceCard>(`
                SELECT idServizio, nome, descrizione, durata, prezzo
                FROM servizi
                LIMIT 6
            `);
        }

        const allServices = await queryDb<ServiceCard>(`
            SELECT idServizio, nome, descrizione, durata, prezzo
            FROM servizi
        `);

        const scored = allServices
            .map(service => ({
                service,
                score: scoreServiceMatch(lastUser, service)
            }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score);

        if (scored.length === 0) {
            return [];
        }

        if (mode === "specific-service" || mode === "advice") {
            return [scored[0].service];
        }

        return scored.slice(0, 3).map(item => item.service);
    } catch (err) {
        console.error("Errore matching servizi:", err);
        return [];
    }
}

function findServiceFromConversationContext(
    messages: any[],
    services: ServiceCard[]
): ServiceCard | null {
    if (!services.length) return null;

    const recentText = [...messages]
        .slice(-6)
        .map((m: any) => normalizeText(m?.content))
        .join(" ");

    let bestService: ServiceCard | null = null;
    let bestScore = 0;

    for (const service of services) {
        const nome = normalizeText(service.nome);
        const descrizione = normalizeText(service.descrizione);

        let score = 0;

        if (recentText.includes(nome)) score += 100;

        const words = nome.split(" ").filter(w => w.length > 2);
        for (const word of words) {
            if (recentText.includes(word)) score += 20;
        }

        const descWords = descrizione.split(" ").filter(w => w.length > 4);
        for (const word of descWords) {
            if (recentText.includes(word)) score += 5;
        }

        if (score > bestScore) {
            bestScore = score;
            bestService = service;
        }
    }

    return bestScore > 0 ? bestService : null;
}

function buildPriceReply(service: ServiceCard): string {
    const nome = safeString(service.nome);
    const prezzo = Number(service.prezzo);
    const durata = Number(service.durata);

    if (Number.isFinite(prezzo) && prezzo > 0) {
        if (Number.isFinite(durata) && durata > 0) {
            return `${nome} costa € ${prezzo.toFixed(2)} e ha una durata di circa ${durata} minuti.`;
        }

        return `${nome} costa € ${prezzo.toFixed(2)}.`;
    }

    return `Al momento non ho un prezzo disponibile per ${nome}.`;
}

function buildServicesReply(services: ServiceCard[]): string {
    if (!services.length) {
        return "Posso aiutarti su taglio, colore, barba e trattamenti, ma al momento non ho trovato un elenco completo dei servizi disponibili.";
    }

    const formatted = services
        .map((s) => {
            const nome = safeString(s.nome);
            const descrizione = safeString(s.descrizione);
            const durata = Number(s.durata);
            const prezzo = Number(s.prezzo);

            let detail = nome;

            if (descrizione) {
                detail += `: ${descrizione}`;
            }

            if (Number.isFinite(prezzo) && prezzo > 0) {
                detail += ` (€ ${prezzo.toFixed(2)})`;
            }

            if (Number.isFinite(durata) && durata > 0) {
                detail += `, durata ${durata} min`;
            }

            return `- ${detail}`;
        })
        .join("\n");

    return `Ecco alcuni servizi disponibili nel salone:\n${formatted}`;
}

function buildProfessionalReply(
    lastUser: string,
    services: ServiceCard[],
    mode: "list" | "specific-service" | "advice" | "generic"
): string {
    const text = normalizeText(lastUser);

    if (mode === "list") {
        return "Ecco alcuni servizi disponibili nel salone:";
    }

    if (services.length > 0) {
        const serviceName = safeString(services[0].nome);

        if (mode === "specific-service") {
            if (
                text.includes("fate") ||
                text.includes("avete") ||
                text.includes("disponibile") ||
                text.includes("avete anche") ||
                text.includes("fate anche")
            ) {
                return `Sì, certo: ${serviceName} è disponibile.`;
            }

            return `Certo: ${serviceName} è disponibile nel salone.`;
        }

        if (mode === "advice") {
            if (text.includes("taglio")) {
                return "In base alla tua richiesta, questo è uno dei servizi più adatti.";
            }

            if (
                text.includes("colore") ||
                text.includes("balayage") ||
                text.includes("tinta") ||
                text.includes("schiar")
            ) {
                return "Per ottenere un risultato armonioso e ben mantenibile, questo servizio è una scelta molto valida.";
            }

            if (
                text.includes("trattamento") ||
                text.includes("rovinati") ||
                text.includes("ricostruzione") ||
                text.includes("anticrespo")
            ) {
                return "Per capelli stressati o sensibilizzati, questo trattamento è tra i più indicati.";
            }

            return "Questo servizio potrebbe essere adatto alla tua richiesta.";
        }
    }

    if (mode === "generic") {
        return "Posso aiutarti con taglio, colore, barba, trattamenti e scelta del servizio più adatto. Dimmi pure cosa stai cercando.";
    }

    return "Posso aiutarti a scegliere il servizio più adatto in base al risultato che vuoi ottenere.";
}

app.post("/api/chat", async (req, res) => {
    try {
        console.log("POST /api/chat ricevuta");

        if (!process.env.HF_TOKEN) {
            console.log("HF_TOKEN mancante");
            return res.status(500).json({
                reply: "HF_TOKEN mancante nel file .env",
                services: []
            });
        }

        const model = process.env.HF_MODEL || "katanemo/Arch-Router-1.5B:hf-inference";
        const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];

        console.log("Messages ricevuti:", messages);

        const allServices = await queryDb<ServiceCard>(`
            SELECT idServizio, nome, descrizione, durata, prezzo
            FROM servizi
        `);

        const lastUser =
            [...messages].reverse().find((m: any) => m?.role === "user")?.content?.toLowerCase() || "";

        console.log("Ultimo messaggio utente:", lastUser);

        const hairKeywords = [
            "capelli", "taglio", "piega", "phon", "piastra", "ricci", "lisci", "frangia", "scalato",
            "colore", "tinta", "balayage", "schiar", "meches", "colpi di sole", "decolor", "tonalizz",
            "trattamento", "cheratina", "ricostruzione", "anti crespo", "anticrespo", "cute", "forfora", "sebo",
            "shampoo", "maschera", "balsamo", "olio", "spray", "prodotto",
            "appuntamento", "prenot", "orari", "salone", "servizi", "servizio", "barba", "sfumatura",
            "prezzo", "costo"
        ];

        const containsHairKeyword = hairKeywords.some(k => lastUser.includes(k));

        const conversationContext = messages
            .map((m: any) => m.content?.toLowerCase() || "")
            .join(" ");

        const contextIsHair = hairKeywords.some(k => conversationContext.includes(k));
        const isHairRelated = containsHairKeyword || contextIsHair || isPriceQuestion(lastUser);

        const genericOk = [
            "ciao",
            "salve",
            "buongiorno",
            "buonasera",
            "aiuto",
            "info",
            "informazioni",
            "cosa puoi fare",
            "cosa puoi dirmi"
        ].some(k => lastUser.includes(k));

        if (lastUser && !isHairRelated && !genericOk) {
            console.log("Domanda fuori tema");
            return res.json({
                reply:
                    "Posso aiutarti solo con consigli e informazioni su capelli e servizi da parrucchiere 😊\n" +
                    "Esempi:\n" +
                    "• Taglio e styling\n" +
                    "• Colore / Balayage\n" +
                    "• Trattamenti per capelli\n\n" +
                    "Dimmi cosa ti interessa!",
                services: []
            });
        }

        if (isPriceQuestion(lastUser)) {
            const contextualService = findServiceFromConversationContext(messages, allServices);

            if (contextualService) {
                return res.json({
                    reply: buildPriceReply(contextualService),
                    services: [contextualService]
                });
            }

            return res.json({
                reply: "Posso dirti il prezzo, ma devo capire a quale servizio ti riferisci. Ad esempio: taglio uomo, taglio + barba, balayage o trattamento ricostruzione.",
                services: []
            });
        }

        const intent = detectIntent(lastUser);
        const requestType = detectRequestType(lastUser);

        if (requestType === "advice" && needsMoreInfoForAdvice(lastUser)) {
            return res.json({
                reply: buildAdviceClarificationReply(lastUser),
                services: []
            });
        }

        let services = await getBestMatchingServices(lastUser, requestType);

        // fallback sulle vecchie logiche se non trova nulla
        if (!services.length) {
            services = await getSuggestedServices(lastUser);
        }

        console.log("Intent:", intent);
        console.log("RequestType:", requestType);
        console.log("Services trovati:", services);

        // elenco servizi
        if (requestType === "list") {
            return res.json({
                reply: "Ecco alcuni servizi disponibili nel salone:",
                services: services.slice(0, 6)
            });
        }

        // servizio specifico o consiglio con servizio coerente
        if ((requestType === "specific-service" || requestType === "advice") && services.length > 0) {
            return res.json({
                reply: buildProfessionalReply(lastUser, services, requestType),
                services: [services[0]]
            });
        }

        const servicesContext =
            services.length > 0
                ? `
SERVIZI REALI DISPONIBILI NEL SALONE:
${services
                        .map(
                            (s) =>
                                `- ${s.nome}${s.prezzo != null ? ` (€ ${s.prezzo})` : ""}${s.durata ? `, durata: ${s.durata} minuti` : ""}${s.descrizione ? ` - ${s.descrizione}` : ""}`
                        )
                        .join("\n")}
`
                : `
SERVIZI REALI DISPONIBILI NEL SALONE:
- Nessun servizio specifico trovato per questa richiesta.
- Puoi dare consigli tecnici generici senza inventare servizi, prezzi o durata.
`;

        const system = `
Sei l’assistente ufficiale del salone "I Parrucchieri".

OBIETTIVO:
Rispondi come un consulente professionale di parrucchiere, esperto in taglio, colore, barba, styling e trattamenti.

REGOLE:
1) Rispondi solo su capelli, barba, trattamenti e servizi del salone.
2) Se l’utente chiede se un servizio è disponibile, rispondi in modo diretto, chiaro e professionale.
3) Se nel contesto è presente un servizio reale del salone, fai riferimento solo a quello e non inventarne altri.
4) Se l’utente chiede un consiglio, rispondi come un professionista del settore: concreto, competente, semplice e sicuro.
5) Non inventare prezzi, orari, disponibilità o servizi non presenti.
6) Se non hai dati certi, dai un consiglio tecnico generale ma realistico.
7) Mantieni un tono elegante, competente e accogliente.
8) Risposte brevi, utili e naturali: massimo 4 righe.
9) Evita elenchi inutili quando l’utente sta chiedendo un servizio specifico.
10) Se un solo servizio è il più coerente, concentrati su quello.

${servicesContext}
`;

        console.log("Invio richiesta a Hugging Face...");

        const completion = await Promise.race([
            hf.chat.completions.create({
                model,
                messages: [
                    { role: "system", content: system },
                    ...messages,
                ],
                max_tokens: 220,
                temperature: 0.35,
            }),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("HF_TIMEOUT")), 25000)
            ),
        ]);

        console.log("Risposta Hugging Face ricevuta");

        const reply = completion.choices?.[0]?.message?.content ?? "";

        return res.json({
            reply: reply.trim() || "Vuoi parlarmi di taglio, colore, barba o trattamenti?",
            services
        });
    } catch (err: any) {
        const msg = String(err?.message || err);
        console.error("HF CHAT ERROR:", err);

        if (msg.includes("HF_TIMEOUT")) {
            return res.status(504).json({
                reply: "Sto impiegando troppo tempo a rispondere. Riprova tra qualche secondo 🙂",
                services: []
            });
        }

        return res.status(500).json({
            reply: "Ho avuto un problema a rispondere. Riprova tra poco 🙂",
            services: []
        });
    }
});

//Richieste DB

//UTENTI
app.get("/api/utenti", async (req, res) => {
    db.query("SELECT * FROM utenti", (err, result) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(result);
        }
    });
});

//SERVIZI
app.get("/api/servizi", async (req, res) => {
    db.query("SELECT * FROM servizi", (err, result) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(result);
        }
    });
});

//PRODOTTI
app.get("/api/prodotti", async (req, res) => {
    db.query("SELECT * FROM prodotti", (err, result) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(result);
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server in ascolto su http://localhost:${PORT}`);
});