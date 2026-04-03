import express from "express";
import fileUpload from "express-fileupload";
import cors from "cors";
import fs from "fs";
import cloudinary from "cloudinary";
import bcrypt from "bcrypt";
import passport from "./config/passport";
import dotenv from "dotenv";
import { connectDatabase, db } from "./db_parrucchieri";

// ROUTES
import aiRoute from "./routes/api-ai";
import loginRoute from "./routes/login";
import googleAuthRoute from "./routes/google-auth";
import utentiRoute from "./routes/utenti";
import appuntamentiRoute from "./routes/appuntamenti";

// SUPABASE


dotenv.config();

// Initialize database connection
connectDatabase().then(() => {
  console.log("Database connesso nel server");
}).catch(err => {
  console.error("Errore connessione database:", err);
  process.exit(1);
});

// EXPRESS
const app = express();
const PORT = 3000;

// CLOUDINARY
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

// MIDDLEWARE
app.use("/", (req, res, next) => {
  console.log(`----> ${req.method}: ${req.originalUrl}`);
  next();
});

app.use("/", express.static("./static"));
app.use("/uploads", express.static("./uploads"));

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:4200",
    credentials: true,
  })
);

app.use(express.json());
app.use(passport.initialize());

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "./tmp/",
  })
);

// CARTELLA UPLOAD
const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

//
// =======================
// CLOUDINARY API
// =======================
// IMG PARRUCCHIERI
app.get("/api/imgParrucchieri", async (req, res) => {
  try {
    const result = await cloudinary.v2.search
      .expression("folder:ImgParrucchieri")
      .sort_by("created_at", "desc")
      .max_results(100)
      .execute();

    const images = result.resources.map((img: any) => img.secure_url);
    res.json(images);
  } catch {
    res.status(500).send("Errore Cloudinary");
  }
});

// IMG PRODOTTI
app.get("/api/imgProdotti", async (req, res) => {
  try {
    const result = await cloudinary.v2.search
      .expression("folder:ImgParrucchieri/prodotti")
      .sort_by("created_at", "desc")
      .max_results(100)
      .execute();

    const images = result.resources.map((img: any) => img.secure_url);
    console.log(images);
    res.json(images);
  } catch {
    res.status(500).send("Errore Cloudinary");
  }
});

//
// =======================
// ROUTES
// =======================
app.use("/api/chat", aiRoute);
app.use("/api/auth", loginRoute);
app.use("/api/auth", googleAuthRoute);
app.use("/api/utenti", utentiRoute);
app.use("/api/appuntamenti", appuntamentiRoute);

//
// =======================
// SUPABASE API ENDPOINTS
// =======================

// GET UTENTI
app.get("/api/utenti", async (req, res) => {
  try {
    const { data, error } = await db.from("utenti").select("*");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Errore server" });
  }
});

// GET SERVIZI
app.get("/api/servizi", async (req, res) => {
  try {
    const { data, error } = await db.from("servizi").select("*");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Errore server" });
  }
});

// GET PRODOTTI
app.get("/api/prodotti", async (req, res) => {
  try {
    const { data, error } = await db
      .from("prodotti")
      .select(
        'idProdotto, foto, nome, marca, formato, descrizione, prezzoRivendita, prezzoAcquisto, quantitaMagazzino, categoria'
      )
      .order("idProdotto", { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Errore server" });
  }
});

//
// =======================
// REGISTER UTENTE
// =======================
app.post("/api/register", async (req, res) => {
  try {
    const { nome, cognome, email, password, telefono, data_nascita, ruolo } =
      req.body;

    const { data: existingUser, error: existingError } = await db
      .from("utenti")
      .select("idUtente")
      .eq("email", email)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existingUser) {
      return res.status(400).json({ message: "Email già registrata" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { error: insertError } = await db.from("utenti").insert({
      nome,
      cognome,
      email,
      password: hashedPassword,
      telefono,
      data_nascita,
      ruolo,
    });

    if (insertError) throw insertError;

    res.status(201).json({ message: "Account creato!" });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Errore server", error: err.message });
  }
});

//
// =======================
// UPDATE STOCK PRODOTTI
// =======================
app.post("/api/products/update-stock", async (req, res) => {
  const cartItems = req.body;

  try {
    for (const item of cartItems) {
      const qty = item.quantita || 1;

      const productId = item.id ?? item.idProdotto;
      const { data: prodotto, error: productError } = await db
        .from("prodotti")
        .select("quantitaMagazzino")
        .eq("idProdotto", productId)
        .maybeSingle();

      if (productError) throw productError;
      if (!prodotto) throw new Error(`Prodotto ${item.id} non trovato`);

      if (prodotto.quantitaMagazzino < qty)
        throw new Error(`Stock insufficiente per ${item.id}`);

      const { error: updateError } = await db
        .from("prodotti")
        .update({ quantitaMagazzino: prodotto.quantitaMagazzino - qty })
        .eq("idProdotto", productId);

      if (updateError) throw updateError;
    }

    res.json({ message: "Stock aggiornato" });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      message: "Errore aggiornamento stock",
      error: err.message,
    });
  }
});

//
// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
  console.log(`Server attivo su http://localhost:${PORT}`);
});
