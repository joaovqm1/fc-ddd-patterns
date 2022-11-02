import Order from "../../../../domain/checkout/entity/order";
import OrderItem from "../../../../domain/checkout/entity/order_item";
import OrderRepositoryInterface from "../../../../domain/checkout/repository/order-repository.interface";
import OrderItemModel from "./order-item.model";
import OrderModel from "./order.model";

export default class OrderRepository implements OrderRepositoryInterface {
  async create(entity: Order): Promise<void> {
    await OrderModel.create(
      {
        id: entity.id,
        customer_id: entity.customerId,
        total: entity.total(),
        items: entity.items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          product_id: item.productId,
          quantity: item.quantity,
        })),
      },
      {
        include: [{ model: OrderItemModel }],
      }
    );
  }

  async update(entity: Order): Promise<void> {
    await OrderModel.update(
      {
        id: entity.id,
        customer_id: entity.customerId,
        total: entity.total(),
      },
      {
        where: { id: entity.id },
      }
    );

    // This is a temp solution since many validations should be done here
    // For example, I would have to check if number of updates items is different
    entity.items.forEach(async function (item) {
      await OrderItemModel.update(
        {
          product_id: item.productId,
          price: item.price,
          order_id: entity.id,
          quantity: item.quantity,
          name: item.name,
        },
        {
          where: { id: item.id },
        }
      );
    });
  }

  async find(id: string): Promise<Order> {
    const orderModel = await this.findModel(id);
    return this.transformOrderModelIntoOrderEntity(orderModel);
  }

  private async findModel(id: string): Promise<OrderModel> {
    try {
      const orderModel = await OrderModel.findOne({
        where: { id },
        include: {
          model: OrderItemModel,
        },
        rejectOnEmpty: true,
      });
      return orderModel;
    } catch (error) {
      throw new Error("Order not found");
    }
  }

  transformOrderModelIntoOrderEntity(orderModel: OrderModel): Order {
    const orderItems: OrderItem[] = [];

    for (const item of orderModel.items) {
      const orderItem = new OrderItem(
        item.id,
        item.name,
        item.price,
        item.product_id,
        item.quantity
      );

      orderItems.push(orderItem);
    }

    return new Order(orderModel.id, orderModel.customer_id, orderItems);
  }

  async findAll(): Promise<Order[]> {
    const orderModels = await OrderModel.findAll({
      include: {
        model: OrderItemModel,
      },
    });
    return orderModels.map(this.transformOrderModelIntoOrderEntity);
  }
}
