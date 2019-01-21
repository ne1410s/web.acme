import { OperationBase } from "@ne1410s/http";
import { ISecureRequest } from "../../interfaces/auth";
import { IAccount } from "../../interfaces/account";
import { DbContext } from "../../../database/db-context";
import { Acme2Service } from "../../../acme-core/services/acme2";
import { IOrder } from "../../interfaces/order";
import { IDomainClaim } from "../../interfaces/challenge";

export class ListAccountsOperation extends OperationBase<ISecureRequest, Array<IAccount>> {
    
    constructor(private readonly db: DbContext) {
        super();
    }
    
    validateRequest(requestData: ISecureRequest): void {}
    validateResponse(responseData: Array<IAccount>): void {}
    
    protected async invokeInternal(requestData: ISecureRequest): Promise<IAccount[]> {
        
        const predicate = { where: { UserID: requestData.authenticUserId }},
              db_accounts = await this.db.dbAccount.findAll(predicate),
              env_tokens = { staging: '', production: '' };
        
        const retVal = [] as Array<IAccount>;
        for (let i = 0; i < db_accounts.length; i++) {

            const db_account = db_accounts[i] as any,
                  env = db_account.IsTest ? 'staging' : 'production',
                  svc = new Acme2Service(env as any),
                  keyPair = JSON.parse(db_account.JWKPair);

            env_tokens[env] = env_tokens[env] || (await svc.tokens.get.invoke()).token;

            const svc_account = await svc.accounts.get.invoke({
                token: env_tokens[env],
                accountId: db_account.AccountID,
                keys: keyPair
            });

            env_tokens[env] = svc_account.token;

            if (svc_account.status === 'valid') {
                const orders = await this.getOrders(svc, keyPair, db_account.AccountID);
                retVal.push({
                    accountId: db_account.AccountID,
                    created: svc_account.created,
                    emails: svc_account.contacts.map(c => c.replace('mailto:', '')),
                    status: svc_account.status,
                    isTest: db_account.IsTest,
                    orders: orders
                });
            }
            else if (svc_account.status === 'deactivated') {
                await this.db.dbOrder.destroy({ where: { AccountID: db_account.AccountID } });
                await this.db.dbAccount.destroy({ where: { AccountID: db_account.AccountID } });
                console.log(`Account ${db_account.AccountID} is deactivated. All references have now been removed`);
            }
        }
        
        return retVal;
    }

    private async getOrders(svc: Acme2Service, publicJwk: JsonWebKey, accountId: number): Promise<Array<IOrder>> {

        const db_orders = await this.db.dbOrder.findAll({ where: { AccountID: accountId }});

        const retVal = [] as Array<IOrder>;
        for(let i = 0; i < db_orders.length; i++) {

            const db_order = db_orders[i] as any,
                  orderId = db_order.OrderID,
                  svc_order = await svc.orders.get.invoke({ accountId, orderId });

            retVal.push({
                orderId: orderId,
                expires: svc_order.expires,
                status: svc_order.status,
                certificateUrl: svc_order.certificateUrl,
                finaliseUrl: svc_order.finaliseUrl,
                domainClaims: await this.getDomainClaims(svc, publicJwk, svc_order.authCodes),
            });
        }

        return retVal;
    }

    private async getDomainClaims(svc: Acme2Service, publicJwk: JsonWebKey, authCodes: Array<string>): Promise<Array<IDomainClaim>> {

        const retVal = [] as Array<IDomainClaim>;

        for (let i = 0; i < authCodes.length; i++) {
    
            const svc_challenge = await svc.challenges.list.invoke({ authCode: authCodes[i] }),
                  svc_details = await svc.challenges.detail.invoke({ listResponse: svc_challenge, publicJwk });

            retVal.push({
                status: svc_challenge.status,
                domain: svc_challenge.identifier.value,
                wildcard: svc_challenge.wildcard,
                expires: svc_challenge.expires,
                challenges: svc_details.detail
                    .filter(d => d.fulfilmentData.implemented)
                    .map(d => ({
                        challengeId: d.challengeId,
                        keyAuth: d.fulfilmentData.keyAuth,
                        type: d.type,
                        status: d.status,
                        title: d.fulfilmentData.title,
                        content: d.fulfilmentData.content          
                    }))
            });
        }

        return retVal;
    }
}