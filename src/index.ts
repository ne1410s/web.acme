import { TokenOperations } from "./operations/token/wrapped-up";
import { AccountOperations } from "./operations/account/wrapped-up";
import { OrderOperations } from "./operations/order/wrapped-up";

export default class Acme2 {
    
    public readonly tokens: TokenOperations;
    public readonly accounts: AccountOperations;
    public readonly orders: OrderOperations;

    private readonly urls: any = {
        staging: 'https://acme-staging-v02.api.letsencrypt.org/acme',
        production: 'https://acme-v02.api.letsencrypt.org/acme'
    };

    constructor(env: 'staging | production') {

        const baseUrl = this.urls[env];

        this.tokens = new TokenOperations(baseUrl);
        this.accounts = new AccountOperations(baseUrl);
        this.orders = new OrderOperations(baseUrl);
    }
}