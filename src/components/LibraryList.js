import * as React from "react";
import { useTranslation } from "react-i18next";
import { generateClient } from "aws-amplify/api";
import { useAuth } from "../context/AuthContext";
import { listLibraryItems } from "../graphql/queries";
import { deleteLibraryItem } from "../graphql/mutations";
import LibraryForm from "./LibraryForm";

const client = typeof window !== "undefined" ? generateClient() : null;

const LibraryList = () => {
  const { t } = useTranslation();
  const { isAuthenticated, hasGroup } = useAuth();
  const isAdmin = hasGroup("dhc-admins");

  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [editingItem, setEditingItem] = React.useState(null); // null = closed, {} = create, {id,...} = edit
  const [showForm, setShowForm] = React.useState(false);

  const fetchItems = React.useCallback(async () => {
    if (!client || !isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const result = await client.graphql({ query: listLibraryItems });
      setItems(result.data.listLibraryItems.items || []);
      setError(null);
    } catch (err) {
      console.error("[LibraryList] Fetch error:", err);
      setError("Failed to load library items.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this library item?")) return;
    try {
      await client.graphql({
        query: deleteLibraryItem,
        variables: { input: { id } },
      });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("[LibraryList] Delete error:", err);
      alert("Failed to delete item.");
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const handleFormSaved = () => {
    setShowForm(false);
    setEditingItem(null);
    fetchItems();
  };

  if (!isAuthenticated) {
    return (
      <div className="dhc-library-notice">
        Sign in to browse the component library.
      </div>
    );
  }

  if (loading) {
    return <div className="dhc-library-notice">Loading...</div>;
  }

  if (error) {
    return <div className="dhc-library-notice dhc-library-error">{error}</div>;
  }

  return (
    <div className="dhc-library">
      {isAdmin && (
        <div className="dhc-library-actions">
          <button className="dhc-button-primary" onClick={handleCreate}>
            {t("library.create")}
          </button>
        </div>
      )}

      {showForm && (
        <LibraryForm
          item={editingItem}
          onClose={handleFormClose}
          onSaved={handleFormSaved}
        />
      )}

      {items.length === 0 ? (
        <p className="dhc-library-notice">{t("library.empty")}</p>
      ) : (
        <div className="dhc-library-table-wrap">
          <table className="dhc-library-table">
            <thead>
              <tr>
                <th>{t("library.field.title")}</th>
                <th>{t("library.field.version")}</th>
                <th>{t("library.field.compatibleClasses")}</th>
                <th>{t("library.field.region")}</th>
                <th>{t("library.field.standards")}</th>
                {isAdmin && <th aria-label="Actions">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    {item.description && (
                      <div className="dhc-library-desc">{item.description}</div>
                    )}
                  </td>
                  <td>{item.version}</td>
                  <td>
                    <div className="dhc-library-badges">
                      {(item.compatibleClasses || []).map((cls) => (
                        <span key={cls} className="dhc-library-badge">
                          {cls.replace("dhc:", "")}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{item.region || "—"}</td>
                  <td>{(item.standards || []).join(", ") || "—"}</td>
                  {isAdmin && (
                    <td>
                      <div className="dhc-library-row-actions">
                        <button
                          className="dhc-button-secondary"
                          onClick={() => handleEdit(item)}
                        >
                          {t("library.edit")}
                        </button>
                        <button
                          className="dhc-button-danger"
                          onClick={() => handleDelete(item.id)}
                        >
                          {t("library.delete")}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LibraryList;
