import { IListChallengesResponse } from "./list";
import { IChallengeDetails } from "./base";

export interface IGetChallengeDetailRequest {
    publicJwk: JsonWebKey;
    listResponse: IListChallengesResponse;
}

export interface IGetChallengeDetailResponse {
    domain: string;
    wildcard: boolean;
    expires: Date;
    detail: Array<IChallengeDetails>;
}