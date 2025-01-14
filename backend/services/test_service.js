function isValidJSON(content) {
    try {
        JSON.parse(content);
        return true;
    } catch (error) {
        return false;
    }
}

const content = {
    title: 'Picnicking',
    date: '2025-10-07',
    description: 'Going picnicking with friends.'
};

console.log(isValidJSON(JSON.stringify(content)));
