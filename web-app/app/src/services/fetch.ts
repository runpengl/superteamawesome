export function makeRequest<T>(url: string, method: string, body?: any) {
    let hasError: boolean;
    return fetch(url, { method, body: JSON.stringify(body) })
        .then((response) => {
            hasError = !response.ok;
            return response.json();
        })
        .then((response) => {
            if (hasError) {
                throw new Error(response.message);
            } else {
                return response as T;
            }
        });
}