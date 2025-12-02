
async function main() {
    const cookie = 'cg.sid.v2=db7a8de5f8e5e1a466882ad1f4ec410064721da177465b4b68cd0be11f4545f8'; // New Session ID

    // 1. Check Cruise Photos Root
    const url = 'http://localhost:3000/api/admin/cruise-photos?folder=';
    console.log('Fetching Cruise Root:', url);
    try {
        const response = await fetch(url, { headers: { 'Cookie': cookie } });
        console.log('Cruise Root Status:', response.status);
        if (!response.ok) {
            const text = await response.text();
            console.log('Error Body:', text.substring(0, 500));
        } else {
            const data = await response.json();
            console.log('Cruise Root OK:', data.ok);
            console.log('Cruise Root Folders:', data.folders?.length);
            if (data.folders && data.folders.length > 0) {
                console.log('Cruise Root First 5 folders:', data.folders.slice(0, 5).map((f: any) => f.name));
                const backup = data.folders.find((f: any) => f.name === '.backup');
                console.log('Cruise Root Has .backup folder:', !!backup);
            }
            console.log('Cruise Root Images:', data.images?.length);
        }
    } catch (error) {
        console.error('Cruise Root Error:', error);
    }

    // 2. Check Cruise Photos Subfolder
    const subfolderUrl = 'http://localhost:3000/api/admin/cruise-photos?folder=' + encodeURIComponent('MSC벨리시마');
    console.log('\nFetching Cruise Subfolder:', subfolderUrl);
    try {
        const subResponse = await fetch(subfolderUrl, { headers: { 'Cookie': cookie } });
        const subData = await subResponse.json();
        console.log('Subfolder OK:', subData.ok);
        console.log('Subfolder Images:', subData.images?.length);
        if (subData.images?.length > 0) {
            console.log('First Image:', subData.images[0].name);
        }
    } catch (error) {
        console.error('Subfolder Error:', error);
    }

    // 3. Check Image Library (Uploads)
    const libraryUrl = 'http://localhost:3000/api/admin/images';
    console.log('\nFetching Image Library:', libraryUrl);
    try {
        const libResponse = await fetch(libraryUrl, { headers: { 'Cookie': cookie } });
        const libData = await libResponse.json();
        console.log('Library OK:', libData.ok);
        console.log('Library Folders:', libData.folders?.length);
        if (libData.folders && libData.folders.length > 0) {
            console.log('Library First 5 folders:', libData.folders.slice(0, 5).map((f: any) => f.name));
            const backup = libData.folders.find((f: any) => f.name === '.backup');
            console.log('Library Has .backup folder:', !!backup);
        }
    } catch (error) {
        console.error('Library Error:', error);
    }
}

main();
