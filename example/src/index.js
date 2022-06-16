import Archiver from "crypto-archive"

let archive;

const cryptoArchiver = new Archiver();

const upload = document.createElement("input");
upload.type = "file";
upload.multiple = true;
upload.accept = "*";
upload.addEventListener("change", async () => {
    const files = upload.files;
    cryptoArchiver.addFiles(files);
});

let encButton = document.createElement("button");
encButton.innerText = "Encrypt";


const download = document.createElement("a");
download.href = "";
download.download = "";
download.innerText = "Download";

encButton.addEventListener("click", async () => {
    archive = await cryptoArchiver.encrypt(null, (percentage) => {
        console.log("Encrypted: " + percentage + "%");
    })
    console.log(archive)
    if(!archive) {
        return;
    }
    const {blob, fileName} = await cryptoArchiver.decrypt(archive.blob.stream(), archive.metadata, archive.password, (percentage) => {
        console.log("Decrypted: " + percentage + "%");
    });
    download.href = URL.createObjectURL(blob);
    download.download = fileName;
    document.body.appendChild(download);
}); 

document.body.appendChild(upload);
document.body.appendChild(encButton);

