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


app.get("/api/imgParrucchieri", async(req, res)=>{
    try{
        const result = await cloudinary.v2.search
            .expression("folder:ImgParrucchieri")
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
