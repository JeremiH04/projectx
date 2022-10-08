const mariadb = require("mariadb");
const bcrypt = require("bcrypt");

const pool = mariadb.createPool({
    host:"localhost",
    port:3306,
    user:"root",
    password:"1234",
    database:"projectx"
});

let conn;

module.exports = class Database{
    async insert(user, table){
        try{
            conn = await pool.getConnection();
            const checkTable = await conn.query("SHOW TABLES");
            if(checkTable.meta) delete checkTable.meta;
            let found = false;
            for(let item of checkTable){
                if(item.Tables_in_projectx === table){
                    found = true;
                    break;
                }
            }
            if(!found) return {err:"Haluttua taulukkoa ei ole olemassa"};

            const player = await this.search(table, "username", user.username);
            if(player.err) return player;
            else if(player.length > 0 && table === "users") return res.json({err:"Käyttäjä on jo olemassa"});

            const keys = Object.keys(user);
            const Qmarks = ("?,".repeat(keys.length)).slice(0, -1);
            const values = Object.values(user);
            const valuesArr = [];
            for(let value of values){
                valuesArr.push(value);
            }
            let keyString = "";
            for(let key of keys){
                keyString += `${key},`; 
            }

            const tableType = await conn.query(`DESCRIBE ${table}`);
            if(tableType.meta) delete tableType.meta;
            
            for(let row of tableType){
                console.log(row.Field);
            }

            keyString = keyString.slice(0, -1);
            const result = await conn.query(`INSERT INTO ${table} (${keyString}) VALUES(${Qmarks})`, valuesArr);
            if(result.affectedRows > 0) return {info:"Tallennus onnistui"};

            return {info:"Tallennus epäonnistui"};
        }catch(e){
            console.log(e.message);
            return {err:"Tallentamisen aikana tapahtui virhe"};
        }finally{
            if(conn) conn.end();
        }
    }

    async updatePW(username, password){ // create API
        try{
            conn = await pool.getConnection();
            let result = await bcrypt.hash(password, 10).then(async (hash)=>{
                let data = await conn.query("UPDATE users SET password=? WHERE username=?", [hash, username]);
                if(data.affectedRows > 0){
                    return {info:"Päivitys onnistui"};
                }
                return {err:"Päivitys epäonnistui"};
            });
            return result;
        }catch(e){
            return {err:"Virhe käyttäjätietojen päivityksessä!"};
        }finally{
            if(conn) conn.end();
        }
    }

    async search(table, params, username){
        try{
            conn = await pool.getConnection();
            const checkTable = await conn.query("SHOW TABLES");
            if(checkTable.meta) delete checkTable.meta;
            let found = false;
            for(let item of checkTable){
                if(item.Tables_in_projectx === table){
                    found = true;
                    break;
                }
            }
            if(!found) return {err:"Haluttua taulukkoa ei ole olemassa"};

            let result;
            if(!username){
                result = await conn.query(`SELECT ${params} FROM ${table}`);
                if(result.meta) delete result.meta;
                return result;
            }

            result = await conn.query(`SELECT ${params} FROM ${table} WHERE username=?`, [username]);
            if(result.meta) delete result.meta;
            return result.length > 0 ? result[0] : result;

        }catch(e){
            return {err:"Virhe tietojen haussa tietokannasta"};
        }
    }

    async verifyLogin(username, password){
        try{
            let user = await this.search("users", "*", username);
            if(user.username){
                const check = await bcrypt.compare(password, user.password).then(result =>{
                    return result;
                });
                return check;
            }
            return false;
        }catch(e){
            return ({err:"Virhe kirjautumistietojen tarkistuksessa"});
        }finally{
            if(conn) conn.end();
        }
    }

    compareTokens(userToken, dbToken){
        if(userToken == dbToken) return true;
        return false;
    }


    async checkTokenDates(id){ // tarkistaa jokaisen tokenin ja poistaa jos on yli tunnin vanha
        try{
            conn = await pool.getConnection();
            const tokens = await conn.query("SELECT username, date FROM tokens");
            delete tokens.meta;
            if(tokens.length == 0){
                clearInterval(id);
                return {info:"Mitään ei poistettu"};
            }
            const d = new Date().getTime();
            
            const poistettava = [];
            tokens.forEach(item =>{
                const cookieD = new Date(item.date).getTime();
                const erotus = d - cookieD;
                if(erotus > 3600000){ //ero täytyy olla vähemmän kuin 3,6 miljoonaa eli 1 tunti
                    poistettava.push(item.username);
                }
            });
            
            if(poistettava.length != 0){ // ghetto ahh solution
                let sqlQuery = "DELETE FROM tokens WHERE ";
                for(let i = 0; i < poistettava.length; i++){
                    if(poistettava[i + 1] == undefined){
                        sqlQuery += "username=? ";
                    }else{
                        sqlQuery += "username=? OR ";
                    }
                }
                const result = await conn.query(sqlQuery, poistettava);
                if(result.affectedRows > 0){
                    return {info:poistettava}
                }
            }
            return {info:null};
        }catch(e){
            return {err:"Virhe tokenien päivämäärän tarkistuksessa"}
        }finally{
            if(conn) conn.end();
        }
    }

    async delete(username, key){ // rework + update API
        try{
            conn = await pool.getConnection();
            if(!key){
                const deleteUser = await conn.query("DELETE FROM users WHERE username=?", [username]);
                const deleteToken = await conn.query("DELETE FROM tokens WHERE username=?", [username]);
                const deletePoints = await conn.query("DELETE FROM userPoints WHERE username=?", [username]);
                return {
                    user:deleteUser.affectedRows > 0 ? true : false,
                    token:deleteToken.affectedRows > 0 ? true : false,
                    points:deletePoints.affectedRows > 0 ? true : false,
                    info:"Poistaminen onnistui"
                };
            }else if(key === "token"){
                const result = await conn.query("DELETE FROM tokens WHERE username=?", [username]);
                if(result.affectedRows > 0){
                    return {info:"Poistaminen onnistui"};
                }
                return {err:"Poistossa meni jokin pieleen, mitään ei poistettu"};
            }
            return {err:"Parametri 'key' on määritelty väärin, mitään ei poistettu"};

        }catch(e){
            return {err:"Poistaminen epäonnistui"};
        }finally{
            if(conn) conn.end();
        }
    }

    async newDelete(username, table){
        try{
            conn = await pool.getConnection();
            if(!table){
                // const deleteUser = await conn.query("DELETE FROM users WHERE username=?", [username]);
                // const deleteToken = await conn.query("DELETE FROM tokens WHERE username=?", [username]);
                // const deletePoints = await conn.query("DELETE FROM points WHERE username=?", [username]);
                // const deletePlayer = await conn.query("DELETE FROM players WHERE username=?", [username]);
                
                // better solution?
                const tables = await conn.query("SHOW TABLES");
                if(tables.meta) delete tables.meta;
                let tableString = "";
                let counter = 0;
                const tableArr = [];
                for(let item of tables){
                    tableArr.push(item.Tables_in_projectx);
                    tableString += `${item.Tables_in_projectx},`;
                    counter++;
                }
                tableString = tableString.slice(0, -1);
                
                let sqlWords = "";
                if(counter > 1){
                    let andWords = "";
                    sqlWords = `DELETE ${tableString} FROM ${tableArr[0]} USING ${tableArr[0]} `;
                    for(let i = 1; i < counter; i++){
                        sqlWords += `INNER JOIN ${tableArr[i]} `;
                        andWords += `${tableArr[i-1]}.username=${tableArr[i]}.username `;
                        if((i+1) !== counter) andWords += "AND "
                    }
                    sqlWords += "WHERE ";
                    sqlWords += andWords;

                    
                }else{
                    sqlWords = `DELETE FROM ${table} WHERE username=?`;
                }

                const result = await conn.query(sqlWords, [username]);
                console.log(result);
                // query here
                
                return {
                    user:deleteUser.affectedRows > 0 ? true : false,
                    token:deleteToken.affectedRows > 0 ? true : false,
                    points:deletePoints.affectedRows > 0 ? true : false,
                    player:deletePlayer.affectedRows > 0 ? true : false,
                    info:"Poistaminen onnistui"
                };
            }

            const result = await conn.query(`DELETE FROM ${table} WHERE username=?`, [username]);
        }catch(e){
            console.log(e.message);
            return {err:"Poiston aikana tapahtui virhe"};
        }finally{
            if(conn) conn.end();
        }
    }
}