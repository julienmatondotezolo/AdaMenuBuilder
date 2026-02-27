import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type {
  MenuData,
  Orientation,
  LayoutDirection,
  Category,
} from "../../types/menu";

export interface MenuDocumentProps {
  menuData: MenuData;
  columnCount: number;
  layoutDirection: LayoutDirection;
  orientation: Orientation;
}

const C = {
  gray900: "#111827",
  gray500: "#6B7280",
  gray400: "#9CA3AF",
  gray300: "#D1D5DB",
  gray200: "#E5E7EB",
  paper: "#faf9f6",
} as const;

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.paper,
    fontFamily: "Times-Roman",
    color: C.gray900,
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 30,
  },
  header: {
    alignItems: "center",
    marginBottom: 18,
  },
  established: {
    fontSize: 7.5,
    letterSpacing: 3.5,
    color: C.gray400,
    fontFamily: "Helvetica",
    marginBottom: 9,
  },
  restaurantName: {
    fontSize: 27,
    fontFamily: "Times-Italic",
    color: C.gray900,
    lineHeight: 1.2,
    marginBottom: 9,
    textAlign: "center",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  subtitleLine: {
    width: 30,
    height: 1,
    backgroundColor: C.gray300,
  },
  subtitle: {
    fontSize: 7.5,
    letterSpacing: 3,
    color: C.gray400,
    fontFamily: "Helvetica-Bold",
  },
  highlightImage: {
    marginBottom: 18,
    height: 100,
    objectFit: "cover",
    borderRadius: 4,
  },
  categoriesContainer: {
    flexDirection: "column",
  },
  category: {
    marginBottom: 22,
  },
  categoryHeader: {
    alignItems: "center",
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 18,
    fontFamily: "Times-Italic",
    color: C.gray900,
    marginBottom: 5,
    textAlign: "center",
  },
  categoryDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  dividerLine: {
    width: 56,
    height: 1,
    backgroundColor: C.gray200,
  },
  dividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.gray300,
  },
  itemsContainer: {
    gap: 13,
  },
  item: {
    alignItems: "center",
    paddingVertical: 2,
  },
  itemNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
    color: C.gray900,
  },
  itemDash: {
    fontSize: 9,
    color: C.gray300,
    fontFamily: "Helvetica",
  },
  itemPrice: {
    fontSize: 10,
    fontFamily: "Helvetica-Oblique",
    color: C.gray500,
  },
  itemDescription: {
    fontSize: 8.5,
    color: C.gray400,
    fontFamily: "Helvetica-Oblique",
    marginTop: 2,
    textAlign: "center",
    maxWidth: 200,
    lineHeight: 1.5,
  },
  emptyItems: {
    fontSize: 9,
    color: C.gray300,
    fontFamily: "Helvetica-Oblique",
    textAlign: "center",
    paddingVertical: 10,
  },
  columnRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
  },
  column: {
    flex: 1,
  },
});

function renderCategory(category: Category) {
  const breakBefore =
    category.pageBreakBefore === true && category.pageBreakMode !== "item";

  return (
    <View key={category.id} id={category.id} style={styles.category} break={breakBefore}>
      {/* Category heading */}
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryName}>{category.name}</Text>
        <View style={styles.categoryDivider}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerDot} />
          <View style={styles.dividerLine} />
        </View>
      </View>

      {/* Items */}
      <View style={styles.itemsContainer}>
        {category.items.length === 0 ? (
          <Text style={styles.emptyItems}>No items in this category yet</Text>
        ) : (
          category.items.map((item) => (
            <View
              key={item.id}
              style={styles.item}
              break={item.pageBreakBefore === true}
            >
              <View style={styles.itemNameRow}>
                <Text style={styles.itemName}>{item.name.toUpperCase()}</Text>
                <Text style={styles.itemDash}>—</Text>
                <Text style={styles.itemPrice}>${item.price}</Text>
              </View>
              {item.description ? (
                <Text style={styles.itemDescription}>{item.description}</Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function renderContent(
  menuData: MenuData,
  columnCount: number,
  layoutDirection: LayoutDirection,
) {
  if (columnCount <= 1) {
    return (
      <View style={styles.categoriesContainer}>
        {menuData.categories.map(renderCategory)}
      </View>
    );
  }

  if (layoutDirection === "Z") {
    const rows: Category[][] = [];
    for (let i = 0; i < menuData.categories.length; i += columnCount) {
      rows.push(menuData.categories.slice(i, i + columnCount));
    }
    return (
      <View style={styles.categoriesContainer}>
        {rows.map((rowCats, rowIdx) => (
          <View key={rowIdx} style={styles.columnRow}>
            {rowCats.map((cat) => (
              <View key={cat.id} style={styles.column}>
                {renderCategory(cat)}
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  // N-shape: column-first
  return (
    <View style={styles.columnRow}>
      {Array.from({ length: columnCount }, (_, i) => i + 1).map((col) => (
        <View key={col} style={styles.column}>
          {menuData.categories
            .filter((cat) => (cat.column ?? 1) === col)
            .map(renderCategory)}
        </View>
      ))}
    </View>
  );
}

export default function MenuDocument({
  menuData,
  columnCount,
  layoutDirection,
  orientation,
}: MenuDocumentProps) {
  return (
    <Document>
      <Page size="A4" orientation={orientation} style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.established}>EST. {menuData.established}</Text>
          <Text style={styles.restaurantName}>{menuData.restaurantName}</Text>
          <View style={styles.subtitleRow}>
            <View style={styles.subtitleLine} />
            <Text style={styles.subtitle}>{menuData.subtitle}</Text>
            <View style={styles.subtitleLine} />
          </View>
        </View>

        {/* Highlight image */}
        {menuData.highlightImage ? (
          <Image src={menuData.highlightImage} style={styles.highlightImage} />
        ) : null}

        {/* Categories */}
        {renderContent(menuData, columnCount, layoutDirection)}
      </Page>
    </Document>
  );
}
