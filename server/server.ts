import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import express from "express";
import fileUpload, { UploadedFile } from "express-fileupload";
import cors from "cors";
import fs from "fs";
import cloudinary, { UploadStream } from "cloudinary";
import OpenAI from "openai";
import mysql from "mysql2";
import aiRoute from "./routes/api-ai";
import loginRoute from "./routes/login";
import googleAuthRoute from "./routes/google-auth";
import { db } from "./db_parrucchieri";
import passport from "./config/passport";

//Configurazione server express
const app = express();
const PORT = 3000;

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

app.use(
  cors({
    origin: "http://localhost:4200",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

//Permette di leggere JSON nel body
app.use(express.json());

// Inizializzazione passport per Google login
app.use(passport.initialize());

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "./tmp/",
  })
);

const uploadDir = "./uploads";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
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
app.use("/api/auth", loginRoute);
app.use("/api/auth", googleAuthRoute);

//Richieste DB

// UTENTI
app.get("/api/utenti", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM utenti");
    res.json(rows);
  } catch (err) {
    console.error("Errore recupero utenti:", err);
    res.status(500).send(err);
  }
});

// SERVIZI
app.get("/api/servizi", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM servizi");
    res.json(rows);
  } catch (err) {
    console.error("Errore recupero servizi:", err);
    res.status(500).send(err);
  }
});

// PRODOTTI
app.get("/api/prodotti", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM prodotti");
    res.json(rows);
  } catch (err) {
    console.error("Errore recupero prodotti:", err);
    res.status(500).send(err);
  }
});

// AGGIORNA STOCK PRODOTTI DOPO PAGAMENTO
app.post("/api/products/update-stock", async (req, res) => {
  const cartItems = req.body;

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ message: "Carrello non valido" });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    for (const item of cartItems) {
      const quantitaAcquistata = item.quantita || 1;

      const [rows]: any = await connection.query(
        "SELECT quantitaMagazzino FROM prodotti WHERE idProdotto = ?",
        [item.id]
      );

      if (rows.length === 0) {
        throw new Error(`Prodotto con id ${item.id} non trovato`);
      }

      const stockAttuale = rows[0].quantitaMagazzino;

      if (stockAttuale < quantitaAcquistata) {
        throw new Error(
          `Stock insufficiente per prodotto ${item.id}`
        );
      }

      await connection.query(
        "UPDATE prodotti SET quantitaMagazzino = quantitaMagazzino - ? WHERE idProdotto = ?",
        [quantitaAcquistata, item.id]
      );
    }

    await connection.commit();

    res.json({ message: "Stock aggiornato correttamente" });

  } catch (err: any) {
    await connection.rollback();

    console.error("Errore aggiornamento stock:", err.message);

    res.status(500).json({
      message: "Errore aggiornamento stock",
      error: err.message
    });

  } finally {
    connection.release();
  }
});

app.listen(PORT, () => {
  console.log(`Server in ascolto su http://localhost:${PORT}`);
});