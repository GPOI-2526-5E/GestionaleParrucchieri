import express from "express";
import fileUpload, { UploadedFile } from "express-fileupload";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";
import cloudinary, { UploadStream } from "cloudinary";
import OpenAI from "openai";

//Configurazione server express
const app = express();
const PORT = 3000;

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

//Permete di leggere JSON nel body
app.use(express.json());

app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: "./tmp/"
}))

const uploadDir = "./uploads";

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}


app.get("/api/imgParrucchieri", async (req, res) => {
    try {
        const result = await cloudinary.v2.search
            .expression("folder:ImgParrucchieri")
            .sort_by("created_at", "desc")
            .max_results(100)
            .execute();
        const images = result.resources.map((img: any) => img.secure_url)
        res.json(images);
    }
    catch (err) {
        res.status(500).send("Errore nel recupero delle immagini da Cloudinary");
    }
})

app.post("/api/chat", async (req, res) => {
    try {
        if (!process.env.HF_TOKEN) {
            return res.status(500).json({ error: "HF_TOKEN mancante nel .env" });
        }

        const model = process.env.HF_MODEL || "katanemo/Arch-Router-1.5B:hf-inference";
        const messages = req.body?.messages ?? [];

        // --- 1) filtro "fuori tema" (robusto e veloce) ---
        const lastUser = [...messages].reverse().find((m: any) => m?.role === "user")?.content?.toLowerCase() || "";

        const hairKeywords = [
            "capelli", "taglio", "piega", "phon", "piastra", "ricci", "lisci", "frangia", "scalato",
            "colore", "tinta", "balayage", "schiar", "meches", "colpi di sole", "decolor", "tonalizz",
            "trattamento", "cheratina", "ricostruzione", "anti crespo", "cute", "forfora", "sebo",
            "shampoo", "maschera", "balsamo", "olio", "spray", "prodotto",
            "appuntamento", "prenot", "orari", "salone"
        ];

        // Verifica se l'ultimo messaggio contiene keyword
        const containsHairKeyword = hairKeywords.some(k => lastUser.includes(k));

        // Verifica se la conversazione precedente era già su tema capelli
        const conversationContext = messages
            .map((m: any) => m.content?.toLowerCase() || "")
            .join(" ");

        const contextIsHair = hairKeywords.some(k => conversationContext.includes(k));

        // Se la conversazione è già nel contesto capelli, accettiamo anche riferimenti tipo "punto 1"
        const isHairRelated = containsHairKeyword || contextIsHair;

        // Se l'utente scrive cose generiche tipo "cosa puoi dirmi" le accettiamo
        const genericOk = ["ciao", "salve", "buongiorno", "buonasera", "aiuto", "info", "informazioni", "cosa puoi fare", "cosa puoi dirmi"]
            .some(k => lastUser.includes(k));

        if (lastUser && !isHairRelated && !genericOk) {
            return res.json({
                reply:
                    "Posso aiutarti solo con consigli e informazioni su **capelli e servizi da parrucchiere** 😊\n" +
                    "Esempi:\n" +
                    "• Taglio e styling\n" +
                    "• Colore / Balayage\n" +
                    "• Trattamenti per capelli\n\n" +
                    "Dimmi cosa ti interessa!",
            });
        }

        // --- 2) system prompt più “forte” e utile ---
        const system = `
Sei l’assistente ufficiale del salone "I Parrucchieri".

REGOLE (OBBLIGATORIE):
1) Rispondi SOLO su capelli e servizi da parrucchiere.
2) Se la domanda è fuori tema: dì che puoi aiutare solo su capelli e proponi 3 opzioni (taglio/colore/trattamento).
3) Non inventare prezzi, orari o indirizzi. Se mancano, chiedi all’utente di specificare oppure suggerisci di contattare il salone.
4) Risposte brevi: massimo 5 righe, tono amichevole e professionale.

COSA PUOI FARE:
- Consigli taglio uomo/donna (anche in base a tipo capello: riccio/liscio/fine/folto)
- Colore, balayage, schiariture: cosa sono e come mantenerle
- Trattamenti: ricostruzione, anti-crespo, cute
- Prodotti: shampoo/maschere/termoprotettori e come usarli
- Prenotazione: guida l’utente su cosa comunicare (servizio desiderato + data + preferenza orario)

Quando l’utente è generico (“cosa puoi dirmi?”) rispondi con 3-4 esempi concreti di domande che può farti.
`;

        // --- 3) chiamata al modello (se supporta parametri, aggiungili) ---
        const completion = await Promise.race([
            hf.chat.completions.create({
                model,
                messages: [
                    { role: "system", content: system },
                    ...messages,
                ],
                max_tokens: 220,
                temperature: 0.6,
            }),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("HF_TIMEOUT")), 25000)
            ),
        ]);

        const reply = completion.choices?.[0]?.message?.content ?? "";
        return res.json({ reply: reply.trim() || "Vuoi parlarmi di taglio, colore o trattamenti?" });
    } catch (err: any) {
        const msg = String(err?.message || err);
        console.error("HF CHAT ERROR:", err);

        if (msg.includes("HF_TIMEOUT")) {
            return res.status(504).json({
                reply: "Sto impiegando troppo tempo a rispondere. Riprova tra qualche secondo 🙂"
            });
        }

        return res.status(500).json({
            reply: "Ho avuto un problema a rispondere. Riprova tra poco 🙂"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server in ascolto su http://localhost:${PORT}`);
})
