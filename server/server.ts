import express from "express";
import fileUpload, { UploadedFile } from "express-fileupload";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";
import cloudinary, { UploadStream } from "cloudinary";
import OpenAI from "openai";
import mysql from "mysql2";
import aiRoute from "./routes/api-ai";

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

app.use("/api/chat", aiRoute);

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