import * as utf8 from "utf8";
import * as nemSdk from "nem-sdk";

export class NEMHelpers {
    
    public static roundXem(val: number): number {
        return Math.round(val*1000000)/1000000;
    }
    
    public static decodeHex(hex: string): string {
        let str = "";
        for (let i = 0; i < hex.length; i += 2)
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        try {
            return utf8.decode(str);
        } catch (e) {
            return str;
        }
    }


    public static decrypt(encryptedMessagePayload: string, recipientPrivateKey: string, senderPublicKey: string): string {
        return this.decodeHex(
            nemSdk.default.crypto.helpers.decode(
                recipientPrivateKey, senderPublicKey, encryptedMessagePayload
            )
        );
    }
}