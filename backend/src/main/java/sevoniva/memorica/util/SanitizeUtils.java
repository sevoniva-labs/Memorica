package sevoniva.memorica.util;

/**
 * Input sanitization utilities for XSS prevention.
 */
public final class SanitizeUtils {

    private SanitizeUtils() {}

    /**
     * Strip HTML tags from user input. Use for plain-text fields like titles, names.
     */
    public static String stripHtml(String input) {
        if (input == null) return null;
        return input.replaceAll("<[^>]*>", "");
    }

    /**
     * Truncate a string to max length. Use as defense-in-depth alongside @Size validation.
     */
    public static String truncate(String input, int maxLength) {
        if (input == null) return null;
        return input.length() > maxLength ? input.substring(0, maxLength) : input;
    }
}
