import type { MenuData } from "../types/menu";

export const sampleMenu: MenuData = {
  title: "Summer Dinner Menu",
  restaurantName: "Lumière Dining",
  subtitle: "SUMMER COLLECTION",
  established: "2024",
  highlightImage: "https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=800&q=80",
  highlightLabel: "TODAY'S HIGHLIGHT",
  highlightTitle: "The Nordic Atlantic Salmon",
  lastEditedBy: "Chef Marco",
  lastEditedTime: "2 mins ago",
  categories: [
    {
      id: "cat-1",
      name: "Starters",
      items: [
        {
          id: "item-1",
          name: "Truffle Parm Fries",
          price: 14,
          description:
            "Hand-cut russet potatoes, white truffle oil, grated parmesan, and fresh rosemary sprigs.",
          featured: false,
        },
        {
          id: "item-2",
          name: "Crispy Calamari",
          price: 18,
          description:
            "Flash-fried wild-caught squid with lemon aioli and spicy marinara dipping sauce.",
          featured: false,
        },
        {
          id: "item-3",
          name: "Burrata Salad",
          price: 16,
          description:
            "Creamy burrata over heirloom tomatoes with basil pesto and aged balsamic.",
          featured: false,
        },
      ],
    },
    {
      id: "cat-2",
      name: "Main Courses",
      items: [
        {
          id: "item-4",
          name: "Pan-Seared Salmon",
          price: 32,
          description:
            "Atlantic salmon served with garlic mashed potatoes, grilled asparagus, and lemon butter sauce.",
          featured: true,
        },
        {
          id: "item-5",
          name: "Signature Ribeye",
          price: 45,
          description:
            "12oz dry-aged ribeye steak, chimichurri sauce, and roasted seasonal vegetables.",
          featured: false,
        },
        {
          id: "item-6",
          name: "Lobster Risotto",
          price: 38,
          description:
            "Creamy arborio rice with butter-poached lobster, shaved parmesan, and fresh chives.",
          featured: false,
        },
        {
          id: "item-7",
          name: "Herb-Crusted Lamb",
          price: 42,
          description:
            "Rack of lamb with rosemary crust, mint jus, and truffle potato gratin.",
          featured: false,
        },
        {
          id: "item-8",
          name: "Wild Mushroom Pasta",
          price: 26,
          description:
            "House-made pappardelle with mixed wild mushrooms, truffle cream, and pecorino.",
          featured: false,
        },
      ],
    },
  ],
};
