import React, { useState } from "react";
import { useI18n } from "../../i18n/I18nContext";

const ServiceForm = () => {
  const { t } = useI18n();
  const [service, setService] = useState({
    id: "",
    name: "",
    description: "",
    expectedTime: "",
    basicCost: "",
    basicFee: "",
    profitMargin: "",
    iss: "",
    icms: "",
    category: "",
    customer: "",
    fiscalISSFrame: "",
    fiscalCNAEFrame: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setService({ ...service, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Submitted Service:", service);
    // Add your API call or further logic here
  };

  return (
    <form onSubmit={handleSubmit} style={styles.formContainer}>
      <div style={styles.formGroup}>
        <label style={styles.label}>{t("common.fields.name")}:</label>
        <input
          style={styles.input}
          type="text"
          name="name"
          value={service.name}
          onChange={handleChange}
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{t("common.fields.description")}:</label>
        <textarea
          name="description"
          value={service.description}
          onChange={handleChange}
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{t("common.fields.expectedTime")}:</label>
        <input
          style={styles.input}
          type="number"
          name="expectedTime"
          value={service.expectedTime}
          onChange={handleChange}
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{t("common.fields.basicCost")}:</label>
        <input
          style={styles.input}
          type="number"
          name="basicCost"
          value={service.basicCost}
          onChange={handleChange}
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{t("common.fields.basicFee")}:</label>
        <input
          style={styles.input}
          type="number"
          name="basicFee"
          value={service.basicFee}
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
          value={service.profitMargin}
          onChange={handleChange}
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{t("common.fields.iss")}:</label>
        <input
          style={styles.input}
          type="number"
          name="iss"
          value={service.iss}
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
          value={service.icms}
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
          value={service.category}
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
          value={service.customer}
          onChange={handleChange}
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{t("common.fields.fiscalISSFrame")}:</label>
        <input
          style={styles.input}
          type="number"
          name="fiscalISSFrame"
          value={service.fiscalISSFrame}
          onChange={handleChange}
          required
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>{t("common.fields.fiscalCNAEFrame")}:</label>
        <input
          style={styles.input}
          type="number"
          name="fiscalCNAEFrame"
          value={service.fiscalCNAEFrame}
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

export default ServiceForm;