import Archive from "./archive.js";
import Keychain from "./keychain.js";
import Zip from "./zip.js";
import {
  generatePassword,
  encryptedSize,
  arrayToB64,
  b64ToArray,
} from "./utils.js";
import { transformStream } from "./streams.js";

class Archiver {
    constructor(maxSize = 100 * 1024 * 1024, maxFiles = 10) {
        this.password = null;
        this.keychain = null;
        this.archive = null;
        this.maxSize = maxSize;
        this.maxFiles = maxFiles;
        this.callback = null;

        this.init();
    }

    init() {
        this.archive = new Archive();
    }

    addFiles(files) {
        if (this.archive) {
            let filesArray = Array.from(files);
            try {
                this.archive.addFiles(filesArray, this.maxSize, this.maxFiles);
            }
            catch (error) {
                console.error(error);
            }
        }
    }

    removeFile(file) {
        if (this.archive) {
            this.archive.remove(file);
        }
    }

    async encrypt(password, callback) {
        if (!this.archive || this.archive.numFiles === 0) {
            return null;
        }
        this.password = password || generatePassword();
        this.keychain = new Keychain(this.password);

		const totalSize = encryptedSize(this.archive.size);
		const encStream = await this.keychain.encryptStream(this.archive.stream);
		const metadata = await this.keychain.encryptMetadata(this.archive);
		const b64meta = arrayToB64(new Uint8Array(metadata));
		let encryptedDataBytes = 0;
		const responseStream = transformStream(
			encStream,
			{
				transform(chunk, controller) {
					encryptedDataBytes += chunk.length;
                    if (callback) {
                        let percentageDone = Math.floor(
                            (encryptedDataBytes / totalSize) * 100,
                        );
                        callback(percentageDone);
                    }
					controller.enqueue(chunk);
				},
			},
			function oncancel() {
				console.log("cancel");
			},
		);

		const headers = {
			"Content-Disposition": `attachment; filename='${encodeURIComponent(
				this.archive.name,
			)}'`,
			"Content-Type": this.archive.type,
			"Content-Length": totalSize,
		};
		const readableStream = new Response(responseStream, { headers });

		const blob = await readableStream.blob();

		const bundeledFiles = {
			blob,
			fileName: encodeURIComponent(this.archive.name),
			password: this.password,
			metadata: b64meta,
		};
        return bundeledFiles;
    }

    async decrypt(blobStream, metadata, password, callback) {
        if (!blobStream || !password) {
            return null;
        }

        // check if blobstream is a blob or a stream
        if (blobStream.constructor.name === "Blob") {
            blobStream = blobStream.stream();
        }

        this.password = password || this.password;
        this.keychain = new Keychain(password);

        metadata = await this.keychain.decryptMetadata(
            b64ToArray(metadata)
        );

        const decryptStream = await this.keychain.decryptStream(blobStream);

        let zipStream = null;
        if (metadata.type === "send-archive") {
            const zip = new Zip(metadata.manifest, decryptStream);
            zipStream = zip.stream;
            metadata.type = "application/zip";
            metadata.size = zip.size;
        }

        let downloadedBytes = 0;

        const responseStream = transformStream(
            zipStream || decryptStream,
            {
                transform(chunk, controller) {
                    downloadedBytes += chunk.length;
                    let percentComplete = Math.floor(
                        (downloadedBytes / metadata.size) * 100
                    );
                    if (callback) {
                        callback(percentComplete);
                    }
                    controller.enqueue(chunk);
                },
            },
            function oncancel() {
                console.log("cancel");
            }
        );

        const headers = {
            "Content-Disposition": `attachment; filename='${metadata.name}'`,
            "Content-Type": metadata.type,
            "Content-Length": metadata.size.toString(),
        };

        const readableStream = new Response(responseStream, { headers });

        const blob = await readableStream.blob();
        
        return {blob, fileName: metadata.name, fileType: metadata.type};
    }

}

export default Archiver;



    

