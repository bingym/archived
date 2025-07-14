package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"sort"

	"github.com/gin-gonic/gin"
)

// 读取JSON文件并解析到v
func readJSONFile(path string, v interface{}) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}

// 读取CSV文件，返回所有行（去除表头）
func readCSVFile(path string) ([][]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	reader := csv.NewReader(f)
	reader.FieldsPerRecord = -1
	rows, err := reader.ReadAll()
	if err != nil {
		return nil, err
	}
	if len(rows) > 1 {
		return rows[1:], nil // 跳过表头
	}
	return [][]string{}, nil
}

type Article struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

type Twitter struct {
	Datetime string `json:"datetime"`
	Content  string `json:"content"`
}

type Video struct {
	Title string `json:"title"`
	Url   string `json:"url"`
}

type Person struct {
	Name        string     `json:"name"`
	Avatar      string     `json:"avatar"`
	Description string     `json:"description"`
	Articles    []*Article `json:"articles"`
	Twitter     []*Twitter `json:"twitter"`
	Videos      []*Video   `json:"videos"`
}

type PersonInfo struct {
	Id     string `json:"id"`
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
}

var PersonInfoList = []*PersonInfo{}
var PersonMap = map[string]*Person{}

func init() {
	dataRoot := "data"
	dirs, err := ioutil.ReadDir(dataRoot)
	if err != nil {
		fmt.Println("读取data目录失败:", err)
		return
	}
	for _, dir := range dirs {
		if !dir.IsDir() {
			continue
		}
		personDir := filepath.Join(dataRoot, dir.Name())
		// 1. 读取info.json
		infoPath := filepath.Join(personDir, "info.json")
		info := PersonInfo{}
		_ = readJSONFile(infoPath, &info)
		// 2. 读取videos.json
		videosPath := filepath.Join(personDir, "videos.json")
		videos := []*Video{}
		_ = readJSONFile(videosPath, &videos)
		// 3. 读取twitter.csv
		twitterPath := filepath.Join(personDir, "twitter.csv")
		twitters := []*Twitter{}
		if _, err := os.Stat(twitterPath); err == nil {
			rows, _ := readCSVFile(twitterPath)
			for _, row := range rows {
				if len(row) >= 3 {
					twitters = append(twitters, &Twitter{
						Datetime: row[0],
						Content:  row[2],
					})
				}
			}
		}
		// 4. 读取articles.json
		articlesPath := filepath.Join(personDir, "articles.json")
		articles := []*Article{}
		_ = readJSONFile(articlesPath, &articles)
		// 5. 构建Person对象
		p := Person{
			Name:     info.Name,
			Avatar:   info.Avatar,
			Articles: articles,
			Twitter:  twitters,
			Videos:   videos,
		}
		PersonInfoList = append(PersonInfoList, &PersonInfo{
			Id:     info.Id,
			Name:   info.Name,
			Avatar: info.Avatar,
		})
		PersonMap[info.Id] = &p
	}

	// PersonInfoList sort
	sort.Slice(PersonInfoList, func(i, j int) bool {
		return PersonInfoList[i].Id < PersonInfoList[j].Id
	})
}

func main() {
	engine := gin.Default()
	engine.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "Hello, World!",
		})
	})
	engine.GET("/api/v1/people", func(c *gin.Context) {
		c.JSON(200, PersonInfoList)
	})
	engine.GET("/api/v1/people/:id", func(c *gin.Context) {
		id := c.Param("id")
		person, ok := PersonMap[id]
		if !ok {
			c.JSON(404, gin.H{"error": "Person not found"})
			return
		}
		c.JSON(200, person)
	})
	engine.Run(":8080")
}
