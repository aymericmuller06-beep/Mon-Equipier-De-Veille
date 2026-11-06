import unicodedata


def normalize(text):
    """Minuscules sans accents, pour comparer « Sécurité » et « securite »"""
    decomposed = unicodedata.normalize("NFD", (text or "").lower())
    return "".join(char for char in decomposed if unicodedata.category(char) != "Mn")
