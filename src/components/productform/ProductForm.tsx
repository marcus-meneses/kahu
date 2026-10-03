import React, { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";

const ProductForm = () => {
  const { t } = useI18n();
  const [product, setProduct] = useState({
    id: "",
    barcodeGTIN: "",
    name: "",
    description: "",
    unit: "",
    acquisitionCost: "",
    salePrice: "",
    stock: "",
    minimumStock: "",
    profitMargin: "",
    icms: "",
    category: "",
    customer: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProduct({ ...product, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Submitted Product:", product);
    // Add your API call or further logic here
  };

  return (
    <form onSubmit={handleSubmit} style={styles.formContainer}>
      <div style={styles.formGroup}>
        <label style={styles.label}>{t("common.fields.barcodeGTIN")}:</label>
        <input
          style={styles.input}
          type="text"
          name="barcodeGTIN"
          value={product.barcodeGTIN}
          onChange={handleChange}
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{t("common.fields.name")}:</label>
        <input
          style={styles.input}
          type="text"
          name="name"
          value={product.name}
          onChange={handleChange}
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{t("common.fields.description")}:</label>
        <textarea
          name="description"
          value={product.description}
          onChange={handleChange}
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{t("common.fields.unit")}:</label>
        <input
          style={styles.input}
          type="number"
          name="unit"
          value={product.unit}
          onChange={handleChange}
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{t("common.fields.acquisitionCost")}:</label>
        <input
          style={styles.input}
          type="number"
          name="acquisitionCost"
          value={product.acquisitionCost}
          onChange={handleChange}
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{t("common.fields.salePrice")}:</label>
        <input
          style={styles.input}
          type="number"
          name="salePrice"
          value={product.salePrice}
          onChange={handleChange}
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{t("common.fields.stock")}:</label>
        <input
          style={styles.input}
          type="number"
          name="stock"
          value={product.stock}
          onChange={handleChange}
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{t("common.fields.minimumStock")}:</label>
        <input
          style={styles.input}
          type="number"
          name="minimumStock"
          value={product.minimumStock}
          onChange={handleChange}
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{t("common.fields.profitMargin")}:</label>
        <input
          style={styles.input}
          type="number"
          name="profitMargin"
          value={product.profitMargin}
          onChange={handleChange}
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{t("common.fields.icms")}:</label>
        <input
          style={styles.input}
          type="number"
          name="icms"
          value={product.icms}
          onChange={handleChange}
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{t("common.fields.category")}:</label>
        <input
          style={styles.input}
          type="number"
          name="category"
          value={product.category}
          onChange={handleChange}
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{t("common.fields.customer")}:</label>
        <input
          style={styles.input}
          type="number"
          name="customer"
          value={product.customer}
          onChange={handleChange}
          required
        />
      </div>
      <button type="submit" style={styles.button}>{t("common.actions.submit")}</button>
    </form>
  );
};

import { CSSProperties } from "react";

const styles: { [key: string]: CSSProperties } = {
  formContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    maxWidth: "400px",
    margin: "auto",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    marginBottom: "0.5rem",
    fontWeight: "bold",
  },
  input: {
    padding: "0.5rem",
    fontSize: "1rem",
    border: "1px solid #ccc",
    borderRadius: "4px",
  },
  button: {
    padding: "0.75rem",
    fontSize: "1rem",
    backgroundColor: "#007BFF",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
};

export default ProductForm;