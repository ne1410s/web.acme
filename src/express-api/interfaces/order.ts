import { ISecureRequest } from "./auth";

export interface ICreateOrderRequest extends ISecureRequest {
    accountId: number;
    domains: Array<string>;
}

export interface IOrderRequest extends ISecureRequest {
    orderId: number;
}

export interface IOrder {
    orderId: number;
    domains: Array<string>;
    status: string;
    expires: Date;
}