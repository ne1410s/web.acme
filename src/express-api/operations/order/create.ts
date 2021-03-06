import { OperationBase, ValidationError } from '@ne1410s/http';
import { CreateOrderRequest, Order } from '../../web-models/order';
import { DbContext } from '../../../database/db-context';
import { Acme2Service } from '../../../acme-core/services/acme2';

export class CreateOrderOperation extends OperationBase<CreateOrderRequest, Order> {
  constructor(private readonly db: DbContext) {
    super(CreateOrderRequest, Order);
  }

  protected async invokeInternal(requestData: CreateOrderRequest): Promise<Order> {
    const db_account = (await this.db.Account.findByPk(requestData.accountId)) as any;

    if (!db_account || db_account.UserID !== requestData.authenticUserId) {
      console.error('No matching account found:', requestData);
      throw new ValidationError('An error occurred', {}, ['Data inconsistency']);
    }

    const env = db_account.IsTest ? 'staging' : ('production' as any),
      svc = new Acme2Service(env),
      token_response = await svc.tokens.get.invoke();

    const svc_order = await svc.orders.upsert.invoke({
      token: token_response.token,
      accountId: requestData.accountId,
      domains: requestData.domains,
      keys: JSON.parse(db_account.JWKPair),
    });

    await this.db.Order.create({
      AccountID: requestData.accountId,
      OrderID: svc_order.orderId,
      Domains: JSON.stringify(requestData.domains),
      CertPkcs8_Base64: null,
    });

    return {
      orderId: svc_order.orderId,
      expires: svc_order.expires,
      status: svc_order.status,
    } as Order;
  }
}
