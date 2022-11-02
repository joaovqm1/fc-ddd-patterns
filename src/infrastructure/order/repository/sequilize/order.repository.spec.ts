import { Sequelize } from "sequelize-typescript";
import Order from "../../../../domain/checkout/entity/order";
import OrderItem from "../../../../domain/checkout/entity/order_item";
import Customer from "../../../../domain/customer/entity/customer";
import Address from "../../../../domain/customer/value-object/address";
import Product from "../../../../domain/product/entity/product";
import CustomerModel from "../../../customer/repository/sequelize/customer.model";
import CustomerRepository from "../../../customer/repository/sequelize/customer.repository";
import ProductModel from "../../../product/repository/sequelize/product.model";
import ProductRepository from "../../../product/repository/sequelize/product.repository";
import OrderItemModel from "./order-item.model";
import OrderModel from "./order.model";
import OrderRepository from "./order.repository";

describe("Order repository test", () => {
  let sequelize: Sequelize;
  const customerRepository = new CustomerRepository();
  const productRepository = new ProductRepository();
  const orderRepository = new OrderRepository();

  beforeEach(async () => {
    sequelize = new Sequelize({
      dialect: "sqlite",
      storage: ":memory:",
      logging: false,
      sync: { force: true },
    });

    await sequelize.addModels([
      CustomerModel,
      OrderModel,
      OrderItemModel,
      ProductModel,
    ]);
    await sequelize.sync();
  });

  afterEach(async () => {
    await sequelize.close();
  });

  it("should create a new order", async () => {
    const order = await createOrder("1");
    const orderItem = order.items[0];

    const orderModel = await OrderModel.findOne({
      where: { id: order.id },
      include: ["items"],
    });

    expect(orderModel.toJSON()).toStrictEqual({
      id: order.id,
      customer_id: order.customerId,
      total: order.total(),
      items: [
        {
          id: orderItem.id,
          name: orderItem.name,
          price: orderItem.price,
          quantity: orderItem.quantity,
          order_id: order.id,
          product_id: orderItem.productId,
        },
      ],
    });
  });

  async function createOrder(orderNumber: string): Promise<Order> {
    const customer = new Customer(
      `customer_${orderNumber}`,
      `Customer for order ${orderNumber}`
    );

    const address = new Address(
      `Street ${orderNumber}`,
      1,
      `Zip code ${orderNumber}`,
      `City ${orderNumber}`
    );
    customer.changeAddress(address);
    await customerRepository.create(customer);

    const product = new Product(
      `product_${orderNumber}`,
      `Product for order ${orderNumber}`,
      10
    );
    await productRepository.create(product);

    const ordemItem = new OrderItem(
      `order_item_${orderNumber}`,
      product.name,
      product.price,
      product.id,
      1
    );

    const order = new Order(`${orderNumber}`, customer.id, [ordemItem]);

    await orderRepository.create(order);

    return order;
  }

  it("should update a order", async () => {
    const order1 = await createOrder("1");
    const order2 = await createOrder("2");

    const orderToUpdate = new Order(order1.id, order2.customerId, order2.items);

    await orderRepository.update(orderToUpdate);

    const orderModel = await OrderModel.findOne({
      where: { id: order1.id },
      include: ["items"],
    });

    expect(orderModel.toJSON()).toStrictEqual({
      id: order1.id,
      customer_id: order2.customerId,
      total: order2.total(),
      items: [
        {
          id: order1.items[0].id,
          name: order1.items[0].name,
          price: order1.items[0].price,
          quantity: order1.items[0].quantity,
          order_id: order1.id,
          product_id: order1.items[0].productId,
        },
        {
          id: order2.items[0].id,
          name: order2.items[0].name,
          price: order2.items[0].price,
          quantity: order2.items[0].quantity,
          order_id: order1.id,
          product_id: order2.items[0].productId,
        },
      ],
    });
  });

  it("should return one order", async () => {
    const orderCreated = await createOrder("1");
    const orderFound = await orderRepository.find(orderCreated.id);

    expect(orderFound).toStrictEqual(orderCreated);
  });

  it("should return many orders", async () => {
    const orderCreated1 = await createOrder("1");
    const orderCreated2 = await createOrder("2");
    const orderFound = await orderRepository.findAll();

    expect(orderFound).toStrictEqual([orderCreated1, orderCreated2]);
  });
});
