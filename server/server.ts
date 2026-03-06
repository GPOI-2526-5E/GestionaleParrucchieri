import express from "express";
import fileUpload, {UploadedFile} from "express-fileupload";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";
import cloudinary, { UploadStream } from "cloudinary";

//Configurazione server express
const app=express();
const PORT=3000;

//Carico le variabili di ambiente dal file .env
dotenv.config({path:".env"});

//Configuro Cloudinary
cloudinary.v2.config(JSON.parse(process.env.cloudinary as string));

app.use("/",(req,res,next)=>{
   console.log("----> "+req.method + ":" +req.originalUrl);
   next();
});

app.use("/",express.static("./static"));

app.use(cors());

//Permete di leggere JSON nel body
app.use(express.json());

app.use(fileUpload({
    useTempFiles:true,
    tempFileDir:"./tmp/"
}))

const uploadDir="./uploads";

if(!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

app.post("/upload",(req,res)=>{
    //Controllo che il file esista
    if(!req.files || !req.files.file)
        return(res.status(400).send("Nessun file caricato"));

    //Cast del file ricevuto
    let file = req.files.file as UploadedFile;

    let uploadPath=`${uploadDir}/${file.name}`;

    file.mv(uploadPath, (err)=>{
        if(err)
            return(res.status(500).send(err.message));

        res.send({
           message:"File caricato con successo!",
           filePath:uploadPath
        });
    })

});

app.post("/api/cloudinary", async(req, res) => {
    let file;
    try{
        //Controllo che il file esista
        if(!req.files || !req.files.file)
            return(res.status(400).send("Manca l'immagine"));

        file= req.files.file as UploadedFile;
        const result= await cloudinary.v2.uploader.upload(
            file.tempFilePath,
            {folder:"EsUpload"}
        );
        res.json(result);
    }
    catch(err){
        res.status(500).send("Errore upload Cloudinary");
    }
    finally{
        if(fs.existsSync(file.tempFile)){
            fs.unlinkSync(file.tempFile);
        }
    }
});

app.get("/api/cloudinaryList", async(req, res)=>{
    try{
        const result = await cloudinary.v2.search
            .expression("folder:EsUpload")
            .sort_by("created_at","desc")
            .max_results(100)
            .execute();
        const images = result.resources.map((img:any) => img.secure_url)
        res.json(images);
    }
    catch(err){
        res.status(500).send("Errore nel recupero delle immagini da Cloudinary");
    }
})



app.listen(PORT,()=>{
    console.log(`Server in ascolto su http://localhost:${PORT}`);
})
